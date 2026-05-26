#!/usr/bin/env bash

set -euo pipefail

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
CONFIG_PATH_DEFAULT="/etc/hostingcreate/github-autoupdate.conf"
SERVICE_NAME="hostingcreate-github-autoupdate"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_FILE="/etc/systemd/system/${SERVICE_NAME}.timer"
STATE_DIR="/var/lib/hostingcreate"
LOG_TAG="hostingcreate-autoupdate"

usage() {
  cat <<EOF
Uso:
  $(basename "${BASH_SOURCE[0]}") install [repo_path] [branch]
  $(basename "${BASH_SOURCE[0]}") run-once [config_path]
  $(basename "${BASH_SOURCE[0]}") start
  $(basename "${BASH_SOURCE[0]}") stop
  $(basename "${BASH_SOURCE[0]}") restart
  $(basename "${BASH_SOURCE[0]}") status
  $(basename "${BASH_SOURCE[0]}") logs

Descripcion:
  Vigila cambios en la rama remota (por defecto master) y actualiza el repo local.
  Si hay cambios, despliega SOLO frontend y backend con Docker Compose.
  Este CLI bloquea despliegues sobre base de datos y n8n.
EOF
}

require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Comando requerido no encontrado: ${cmd}"
    exit 1
  fi
}

load_config() {
  local config_path="$1"
  if [[ ! -f "${config_path}" ]]; then
    echo "No existe archivo de configuracion: ${config_path}"
    exit 1
  fi

  # shellcheck disable=SC1090
  source "${config_path}"

  if [[ -z "${REPO_PATH:-}" ]]; then
    echo "REPO_PATH no esta definido en ${config_path}"
    exit 1
  fi

  BRANCH="${BRANCH:-master}"
  AUTO_DEPLOY="${AUTO_DEPLOY:-true}"
  COMPOSE_WORKDIR="${COMPOSE_WORKDIR:-${REPO_PATH}}"
  COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
  FRONT_SERVICE="${FRONT_SERVICE:-frontend}"
  BACK_SERVICE="${BACK_SERVICE:-backend}"
}

validate_protected_service_name() {
  local service_name="$1"
  local lower_name
  lower_name="$(echo "${service_name}" | tr '[:upper:]' '[:lower:]')"

  if [[ "${lower_name}" =~ (^|[-_])(db|database|postgres|postgresql|mysql|mariadb|mongo|mongodb|redis|n8n)([-_]|$) ]]; then
    echo "Servicio bloqueado por seguridad: ${service_name}"
    echo "Este CLI solo puede desplegar front y back."
    exit 1
  fi
}

deploy_front_back() {
  require_command docker

  if [[ ! -d "${COMPOSE_WORKDIR}" ]]; then
    echo "COMPOSE_WORKDIR no existe: ${COMPOSE_WORKDIR}"
    exit 1
  fi

  validate_protected_service_name "${FRONT_SERVICE}"
  validate_protected_service_name "${BACK_SERVICE}"

  if [[ "${FRONT_SERVICE}" == "${BACK_SERVICE}" ]]; then
    echo "FRONT_SERVICE y BACK_SERVICE no pueden ser iguales."
    exit 1
  fi

  logger -t "${LOG_TAG}" "Desplegando servicios permitidos: ${FRONT_SERVICE}, ${BACK_SERVICE}"

  (
    cd "${COMPOSE_WORKDIR}"
    docker compose -f "${COMPOSE_FILE}" up -d --build --no-deps "${FRONT_SERVICE}" "${BACK_SERVICE}"
  )
}

write_default_config() {
  local config_path="$1"
  local repo_path="$2"
  local branch="$3"

  sudo mkdir -p "$(dirname "${config_path}")"

  sudo tee "${config_path}" > /dev/null <<EOF
# Ruta absoluta del repositorio local
REPO_PATH="${repo_path}"

# Rama remota a vigilar (master/main)
BRANCH="${branch}"

# Habilita despliegue automatico cuando hay cambios
AUTO_DEPLOY="true"

# Ruta de trabajo para docker compose
COMPOSE_WORKDIR="${repo_path}"

# Archivo compose
COMPOSE_FILE="docker-compose.yml"

# SOLO servicios permitidos para despliegue
FRONT_SERVICE="frontend"
BACK_SERVICE="backend"
EOF
}

write_systemd_units() {
  local config_path="$1"

  sudo tee "${SERVICE_FILE}" > /dev/null <<EOF
[Unit]
Description=Hostingcreate GitHub Auto Update Service
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/env bash ${SCRIPT_PATH} run-once ${config_path}
EOF

  sudo tee "${TIMER_FILE}" > /dev/null <<EOF
[Unit]
Description=Run Hostingcreate GitHub Auto Update every minute

[Timer]
OnBootSec=30s
OnUnitActiveSec=60s
AccuracySec=10s
Unit=${SERVICE_NAME}.service

[Install]
WantedBy=timers.target
EOF

  sudo systemctl daemon-reload
}

run_once() {
  local config_path="$1"

  require_command git
  load_config "${config_path}"

  if [[ ! -d "${REPO_PATH}/.git" ]]; then
    echo "La ruta no parece un repositorio git: ${REPO_PATH}"
    exit 1
  fi

  mkdir -p "${STATE_DIR}"

  local repo_key
  repo_key="$(echo "${REPO_PATH}_${BRANCH}" | tr '/ ' '__')"
  local state_file="${STATE_DIR}/${repo_key}.last_remote_sha"

  pushd "${REPO_PATH}" > /dev/null

  git fetch origin "${BRANCH}" --quiet

  local remote_sha
  remote_sha="$(git rev-parse FETCH_HEAD)"

  local current_branch
  current_branch="$(git rev-parse --abbrev-ref HEAD)"

  if [[ "${current_branch}" != "${BRANCH}" ]]; then
    git checkout "${BRANCH}" --quiet
  fi

  local local_sha
  local_sha="$(git rev-parse HEAD)"

  local last_sha=""
  if [[ -f "${state_file}" ]]; then
    last_sha="$(cat "${state_file}")"
  fi

  if [[ "${remote_sha}" == "${local_sha}" && "${remote_sha}" == "${last_sha}" ]]; then
    logger -t "${LOG_TAG}" "Sin cambios en ${REPO_PATH} (${BRANCH})"
    popd > /dev/null
    exit 0
  fi

  git pull --ff-only origin "${BRANCH}"
  echo "${remote_sha}" > "${state_file}"

  logger -t "${LOG_TAG}" "Actualizado ${REPO_PATH} (${BRANCH}) a ${remote_sha}"

  if [[ "${AUTO_DEPLOY}" == "true" ]]; then
    deploy_front_back
  else
    logger -t "${LOG_TAG}" "AUTO_DEPLOY desactivado; solo se actualizo codigo."
  fi

  popd > /dev/null
}

install_cli() {
  local repo_path="${1:-$PWD}"
  local branch="${2:-master}"
  local config_path="${CONFIG_PATH_DEFAULT}"

  if [[ ! -d "${repo_path}/.git" ]]; then
    echo "La ruta indicada no contiene .git: ${repo_path}"
    exit 1
  fi

  write_default_config "${config_path}" "${repo_path}" "${branch}"
  write_systemd_units "${config_path}"

  sudo systemctl enable "${SERVICE_NAME}.timer"
  sudo systemctl restart "${SERVICE_NAME}.timer"

  echo "Instalacion completa."
  echo "Config: ${config_path}"
  echo "Service: ${SERVICE_FILE}"
  echo "Timer: ${TIMER_FILE}"
  echo "Edita FRONT_SERVICE y BACK_SERVICE en ${config_path} para ajustar nombres."
}

cmd="${1:-}"

case "${cmd}" in
  install)
    install_cli "${2:-}" "${3:-}"
    ;;
  run-once)
    run_once "${2:-${CONFIG_PATH_DEFAULT}}"
    ;;
  start)
    sudo systemctl start "${SERVICE_NAME}.timer"
    ;;
  stop)
    sudo systemctl stop "${SERVICE_NAME}.timer"
    ;;
  restart)
    sudo systemctl restart "${SERVICE_NAME}.timer"
    ;;
  status)
    sudo systemctl status "${SERVICE_NAME}.timer" --no-pager
    ;;
  logs)
    sudo journalctl -u "${SERVICE_NAME}.service" -u "${SERVICE_NAME}.timer" -n 100 --no-pager
    ;;
  *)
    usage
    exit 1
    ;;
esac
