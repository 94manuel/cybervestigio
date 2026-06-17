#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$HOME/cybervestigio"
NAMESPACE="cybervestigio"

cd "$APP_DIR"

echo "==> Descargando cambios"
git pull origin master

echo "==> Detectando cambios"
CHANGED="$(git diff --name-only HEAD@{1} HEAD || true)"
echo "$CHANGED"

update_api=false
update_web=false
update_mailer=false
update_k8s=false

if echo "$CHANGED" | grep -E '^(apps/api/|package-lock.json|package.json)' >/dev/null; then
  update_api=true
fi

if echo "$CHANGED" | grep -E '^(apps/web/|package-lock.json|package.json)' >/dev/null; then
  update_web=true
fi

if echo "$CHANGED" | grep -E '^(apps/mailer/|package-lock.json|package.json)' >/dev/null; then
  update_mailer=true
fi

if echo "$CHANGED" | grep -E '^(k8s/)' >/dev/null; then
  update_k8s=true
fi

if [ "$update_api" = true ]; then
  TAG="api-$(date +%Y%m%d%H%M%S)"
  echo "==> Construyendo API: $TAG"
  docker build -t cybervestigio-api:$TAG -f apps/api/Dockerfile.prod apps/api
  minikube image load cybervestigio-api:$TAG
  kubectl set image deployment/api api=cybervestigio-api:$TAG -n "$NAMESPACE"
fi

if [ "$update_web" = true ]; then
  TAG="web-$(date +%Y%m%d%H%M%S)"
  echo "==> Construyendo WEB: $TAG"
  docker build -t cybervestigio-web:$TAG -f apps/web/Dockerfile.prod apps/web
  minikube image load cybervestigio-web:$TAG
  kubectl set image deployment/web web=cybervestigio-web:$TAG -n "$NAMESPACE"
fi

if [ "$update_mailer" = true ]; then
  TAG="mailer-$(date +%Y%m%d%H%M%S)"
  echo "==> Construyendo MAILER: $TAG"
  docker build -t cybervestigio-mailer:$TAG -f apps/mailer/Dockerfile.prod apps/mailer
  minikube image load cybervestigio-mailer:$TAG
  kubectl set image deployment/mailer mailer=cybervestigio-mailer:$TAG -n "$NAMESPACE"
fi

if [ "$update_k8s" = true ]; then
  echo "==> Aplicando manifiestos Kubernetes"
  cd "$APP_DIR/k8s"
  kubectl apply -f cybervestigio-config.yaml
  kubectl apply -f cybervestigio-data.yaml
  kubectl apply -f cybervestigio-minio.yaml
  kubectl apply -f cybervestigio-apps.yaml
  kubectl apply -f cybervestigio-n8n.yaml
  kubectl apply -f cybervestigio-ingress.yaml

  echo "==> Reiniciando servicios por cambios de configuración"
  kubectl rollout restart deployment/api -n "$NAMESPACE" || true
  kubectl rollout restart deployment/web -n "$NAMESPACE" || true
  kubectl rollout restart deployment/mailer -n "$NAMESPACE" || true
  kubectl rollout restart deployment/n8n -n "$NAMESPACE" || true
fi

echo "==> Esperando deployments"
kubectl rollout status deployment/api -n "$NAMESPACE" --timeout=180s || true
kubectl rollout status deployment/web -n "$NAMESPACE" --timeout=180s || true
kubectl rollout status deployment/mailer -n "$NAMESPACE" --timeout=180s || true

echo "==> Estado final"
kubectl get pods -n "$NAMESPACE"
kubectl get svc -n "$NAMESPACE"
kubectl get ingress -n "$NAMESPACE"

echo "==> Probando API"
curl -sS -H "Host: api.cybervestigio.com" http://69.164.244.72/api/v1/health || true
echo