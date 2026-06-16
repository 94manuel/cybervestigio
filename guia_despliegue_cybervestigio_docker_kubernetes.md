# Guía completa de despliegue de CyberVestigio: Docker → Minikube → Kubernetes → Ingress

Esta guía documenta el proceso completo para desplegar el proyecto **CyberVestigio** en un VPS Linux usando:

- Docker Engine
- kubectl
- Minikube
- Helm
- NGINX Ingress Controller
- iptables para publicar el Ingress de Minikube por la IP pública del VPS
- Kubernetes manifests para `web`, `api`, `mailer`, `postgres`, `redis`, `n8n` e `ingress`

> Proyecto usado: `https://github.com/94manuel/cybervestigio.git`

---

## 0. Arquitectura objetivo

```text
Internet
  |
  |  cybervestigio.com
  |  api.cybervestigio.com
  |  n8n.cybervestigio.com
  v
IP pública del VPS: 69.164.244.72
  |
  | iptables DNAT 80  -> 192.168.49.2:31606
  | iptables DNAT 443 -> 192.168.49.2:30901
  v
Minikube
  |
  v
NGINX Ingress Controller
  |
  +--> cybervestigio.com      -> web-service:3000
  +--> www.cybervestigio.com  -> web-service:3000
  +--> api.cybervestigio.com  -> api-service:4000
  +--> n8n.cybervestigio.com  -> n8n-service:5678
```

Servicios internos:

```text
web Next.js       -> puerto 3000
api NestJS        -> puerto 4000
mailer worker     -> consume cola Redis
postgres          -> puerto 5432
redis             -> puerto 6379
n8n               -> puerto 5678
```

---

## 1. Preparación del VPS

### 1.1 Actualizar sistema

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl ca-certificates gnupg apt-transport-https git nano lsof
```

Si el sistema indica `System restart required`, reiniciar:

```bash
sudo reboot
```

---

## 2. Instalación de Docker

### 2.1 Limpiar paquetes conflictivos

```bash
sudo apt remove -y docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc || true
```

### 2.2 Configurar repositorio oficial de Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl

sudo install -m 0755 -d /etc/apt/keyrings

sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc

sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
```

### 2.3 Instalar Docker Engine

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

### 2.4 Validar Docker

```bash
docker version
docker ps
```

Si estás usando un usuario normal, agregarlo al grupo Docker:

```bash
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

---

## 3. Instalación de kubectl

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

rm kubectl
```

Validar:

```bash
kubectl version --client
```

---

## 4. Instalación de Minikube

```bash
curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64

sudo install minikube-linux-amd64 /usr/local/bin/minikube

rm minikube-linux-amd64
```

Validar:

```bash
minikube version
```

---

## 5. Arrancar Kubernetes con Minikube

> Importante: no usar `root` para arrancar Minikube con Docker.

```bash
minikube start --driver=docker
minikube config set driver docker
```

Validar:

```bash
kubectl get nodes
kubectl get pods -A
```

Resultado esperado:

```text
NAME       STATUS   ROLES           VERSION
minikube   Ready    control-plane   v1.xx.x
```

---

## 6. Instalar Helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Validar:

```bash
helm version
```

---

## 7. Instalar NGINX Ingress Controller

### 7.1 Agregar repositorio Helm

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm repo list
```

### 7.2 Instalar Ingress Controller

```bash
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

En Minikube el servicio puede quedar con `EXTERNAL-IP <pending>`, esto es normal.

Validar:

```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

Ejemplo:

```text
ingress-nginx-controller   LoadBalancer   10.x.x.x   <pending>   80:31606/TCP,443:30901/TCP
```

Los puertos importantes son:

```text
HTTP_NODEPORT=31606
HTTPS_NODEPORT=30901
```

---

## 8. Exponer Minikube por la IP pública del VPS

En este ejemplo:

```text
PUBLIC_IP=69.164.244.72
MINIKUBE_IP=192.168.49.2
HTTP_NODEPORT=31606
HTTPS_NODEPORT=30901
```

Validar IP de Minikube:

```bash
minikube ip
```

### 8.1 Variables

```bash
MINIKUBE_IP=$(minikube ip)
PUBLIC_IP=69.164.244.72
HTTP_NODEPORT=31606
HTTPS_NODEPORT=30901
```

### 8.2 Activar forwarding

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

### 8.3 Reglas de forwarding

```bash
sudo iptables -I FORWARD 1 -p tcp -d $MINIKUBE_IP --dport $HTTP_NODEPORT -j ACCEPT
sudo iptables -I FORWARD 1 -p tcp -s $MINIKUBE_IP --sport $HTTP_NODEPORT -j ACCEPT

sudo iptables -I FORWARD 1 -p tcp -d $MINIKUBE_IP --dport $HTTPS_NODEPORT -j ACCEPT
sudo iptables -I FORWARD 1 -p tcp -s $MINIKUBE_IP --sport $HTTPS_NODEPORT -j ACCEPT
```

### 8.4 DNAT únicamente para la IP pública

```bash
sudo iptables -t nat -I PREROUTING 1 -p tcp -d $PUBLIC_IP --dport 80 \
  -j DNAT --to-destination $MINIKUBE_IP:$HTTP_NODEPORT

sudo iptables -t nat -I POSTROUTING 1 -p tcp -d $MINIKUBE_IP --dport $HTTP_NODEPORT \
  -j MASQUERADE

sudo iptables -t nat -I PREROUTING 1 -p tcp -d $PUBLIC_IP --dport 443 \
  -j DNAT --to-destination $MINIKUBE_IP:$HTTPS_NODEPORT

sudo iptables -t nat -I POSTROUTING 1 -p tcp -d $MINIKUBE_IP --dport $HTTPS_NODEPORT \
  -j MASQUERADE
```

### 8.5 Permitir pruebas desde el mismo VPS hacia su IP pública

```bash
sudo iptables -t nat -I OUTPUT 1 -p tcp -d $PUBLIC_IP --dport 80 \
  -j DNAT --to-destination $MINIKUBE_IP:$HTTP_NODEPORT

sudo iptables -t nat -I OUTPUT 1 -p tcp -d $PUBLIC_IP --dport 443 \
  -j DNAT --to-destination $MINIKUBE_IP:$HTTPS_NODEPORT
```

### 8.6 Guardar reglas

```bash
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
sudo netfilter-persistent reload
```

### 8.7 Hacer permanente el forwarding

```bash
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-kubernetes-forward.conf
sudo sysctl --system
```

---

## 9. Advertencia importante sobre iptables

No crear reglas genéricas como estas:

```bash
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.49.2:31606
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination 192.168.49.2:30901
```

Estas reglas redirigen todo HTTP/HTTPS del host hacia Minikube y pueden romper:

- `apt-get`
- `npm install`
- `docker build`
- descargas desde Debian
- descargas desde npm registry
- certificados TLS

Usar siempre `-d $PUBLIC_IP`:

```bash
sudo iptables -t nat -I PREROUTING 1 -p tcp -d $PUBLIC_IP --dport 80 -j DNAT --to-destination $MINIKUBE_IP:$HTTP_NODEPORT
sudo iptables -t nat -I PREROUTING 1 -p tcp -d $PUBLIC_IP --dport 443 -j DNAT --to-destination $MINIKUBE_IP:$HTTPS_NODEPORT
```

### 9.1 Limpiar reglas genéricas incorrectas

```bash
while sudo iptables -t nat -C PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.49.2:31606 2>/dev/null; do
  sudo iptables -t nat -D PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.49.2:31606
done

while sudo iptables -t nat -C PREROUTING -p tcp --dport 443 -j DNAT --to-destination 192.168.49.2:30901 2>/dev/null; do
  sudo iptables -t nat -D PREROUTING -p tcp --dport 443 -j DNAT --to-destination 192.168.49.2:30901
done

sudo netfilter-persistent save
```

---

## 10. Clonar el proyecto

```bash
cd ~
git clone https://github.com/94manuel/cybervestigio.git
cd cybervestigio
```

Si ya está clonado:

```bash
cd ~/cybervestigio
git pull origin master
```

---

## 11. Construir imágenes Docker

### 11.1 Construir imágenes en Docker local del VPS

```bash
cd ~/cybervestigio

docker build -t cybervestigio-api:local -f apps/api/Dockerfile.prod apps/api
docker build -t cybervestigio-web:local -f apps/web/Dockerfile.prod apps/web
docker build -t cybervestigio-mailer:local -f apps/mailer/Dockerfile.prod apps/mailer
```

Verificar:

```bash
docker images | grep cybervestigio
```

### 11.2 Cargar imágenes a Minikube

```bash
minikube image load cybervestigio-api:local
minikube image load cybervestigio-web:local
minikube image load cybervestigio-mailer:local
```

Verificar:

```bash
minikube image ls | grep cybervestigio
```

> Alternativa: construir directamente dentro del Docker de Minikube:
>
> ```bash
> eval $(minikube docker-env)
> docker build -t cybervestigio-api:local -f apps/api/Dockerfile.prod apps/api
> docker build -t cybervestigio-web:local -f apps/web/Dockerfile.prod apps/web
> docker build -t cybervestigio-mailer:local -f apps/mailer/Dockerfile.prod apps/mailer
> ```

---

## 12. Crear namespace de Kubernetes

```bash
kubectl create namespace cybervestigio --dry-run=client -o yaml | kubectl apply -f -
```

Validar:

```bash
kubectl get namespace cybervestigio
```

---

## 13. Crear carpeta de manifiestos

```bash
cd ~/cybervestigio
mkdir -p k8s
cd k8s
```

---

## 14. Crear Secret y ConfigMap

Crear archivo:

```bash
nano cybervestigio-config.yaml
```

Contenido:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cybervestigio-secrets
  namespace: cybervestigio
type: Opaque
stringData:
  POSTGRES_DB: cybervestigio
  POSTGRES_USER: cybervestigio
  POSTGRES_PASSWORD: CAMBIA_ESTA_CLAVE_POSTGRES
  JWT_SECRET: CAMBIA_ESTA_CLAVE_JWT_DE_32_CARACTERES
  ADMIN_INITIAL_NAME: Administrador CyberVestigio
  ADMIN_INITIAL_EMAIL: admin@cybervestigio.com
  ADMIN_INITIAL_PASSWORD: CAMBIA_ESTA_CLAVE_ADMIN
  SMTP_HOST: smtp.hostinger.com
  SMTP_PORT: "587"
  SMTP_SECURE: "false"
  SMTP_USER: contacto@cybervestigio.com
  SMTP_PASS: CAMBIA_ESTA_CLAVE_SMTP
  SMTP_FROM: contacto@cybervestigio.com
  N8N_BASIC_AUTH_USER: admin
  N8N_BASIC_AUTH_PASSWORD: CAMBIA_ESTA_CLAVE_N8N
  N8N_ENCRYPTION_KEY: CAMBIA_ESTA_CLAVE_LARGA_N8N
  N8N_CHAT_WEBHOOK_TOKEN: CAMBIA_ESTE_TOKEN_CHAT
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cybervestigio-config
  namespace: cybervestigio
data:
  FRONTEND_URL: https://cybervestigio.com
  NEXT_PUBLIC_SITE_URL: https://cybervestigio.com
  JWT_EXPIRES_IN: 8h
  REDIS_URL: redis://redis-service:6379
  MAIL_QUEUE_NAME: cybervestigio-mail
  API_INTERNAL_URL: http://api-service:4000/api/v1
  N8N_HOST: n8n.cybervestigio.com
  N8N_EDITOR_BASE_URL: https://n8n.cybervestigio.com
  N8N_WEBHOOK_URL: https://n8n.cybervestigio.com/
  N8N_CHAT_WEBHOOK_URL: https://n8n.cybervestigio.com/webhook/cybervestigio-chat
```

Aplicar:

```bash
kubectl apply -f cybervestigio-config.yaml
```

Validar:

```bash
kubectl get secret -n cybervestigio
kubectl get configmap -n cybervestigio
```

---

## 15. Crear PostgreSQL y Redis

Crear archivo:

```bash
nano cybervestigio-data.yaml
```

Contenido:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: cybervestigio
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: cybervestigio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: POSTGRES_DB
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: POSTGRES_USER
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: POSTGRES_PASSWORD
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: cybervestigio
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: cybervestigio
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: cybervestigio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: redis-data
              mountPath: /data
      volumes:
        - name: redis-data
          persistentVolumeClaim:
            claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: cybervestigio
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

Aplicar:

```bash
kubectl apply -f cybervestigio-data.yaml
```

Validar:

```bash
kubectl get pods -n cybervestigio
kubectl get pvc -n cybervestigio
kubectl get svc -n cybervestigio
```

---

## 16. Crear API, Web y Mailer

Crear archivo:

```bash
nano cybervestigio-apps.yaml
```

Contenido:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: cybervestigio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: cybervestigio-api:local
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 4000
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "4000"
            - name: FRONTEND_URL
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: FRONTEND_URL
            - name: DATABASE_URL
              value: postgresql://cybervestigio:CAMBIA_ESTA_CLAVE_POSTGRES@postgres-service:5432/cybervestigio?schema=public
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: JWT_SECRET
            - name: JWT_EXPIRES_IN
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: JWT_EXPIRES_IN
            - name: ADMIN_INITIAL_NAME
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: ADMIN_INITIAL_NAME
            - name: ADMIN_INITIAL_EMAIL
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: ADMIN_INITIAL_EMAIL
            - name: ADMIN_INITIAL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: ADMIN_INITIAL_PASSWORD
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: REDIS_URL
            - name: MAIL_QUEUE_NAME
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: MAIL_QUEUE_NAME
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: cybervestigio
spec:
  selector:
    app: api
  ports:
    - port: 4000
      targetPort: 4000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mailer
  namespace: cybervestigio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mailer
  template:
    metadata:
      labels:
        app: mailer
    spec:
      containers:
        - name: mailer
          image: cybervestigio-mailer:local
          imagePullPolicy: IfNotPresent
          env:
            - name: NODE_ENV
              value: production
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: REDIS_URL
            - name: MAIL_QUEUE_NAME
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: MAIL_QUEUE_NAME
            - name: SMTP_HOST
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: SMTP_HOST
            - name: SMTP_PORT
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: SMTP_PORT
            - name: SMTP_SECURE
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: SMTP_SECURE
            - name: SMTP_USER
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: SMTP_USER
            - name: SMTP_PASS
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: SMTP_PASS
            - name: SMTP_FROM
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: SMTP_FROM
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: cybervestigio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: cybervestigio-web:local
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "3000"
            - name: API_INTERNAL_URL
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: API_INTERNAL_URL
            - name: NEXT_PUBLIC_SITE_URL
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: NEXT_PUBLIC_SITE_URL
            - name: N8N_CHAT_WEBHOOK_URL
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: N8N_CHAT_WEBHOOK_URL
            - name: N8N_CHAT_WEBHOOK_TOKEN
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: N8N_CHAT_WEBHOOK_TOKEN
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: cybervestigio
spec:
  selector:
    app: web
  ports:
    - port: 3000
      targetPort: 3000
```

> Cambia `CAMBIA_ESTA_CLAVE_POSTGRES` por la misma contraseña declarada en el Secret.

Aplicar:

```bash
kubectl apply -f cybervestigio-apps.yaml
```

Validar:

```bash
kubectl get pods -n cybervestigio
kubectl logs -n cybervestigio deploy/api
kubectl logs -n cybervestigio deploy/web
kubectl logs -n cybervestigio deploy/mailer
```

---

## 17. Crear n8n

Crear archivo:

```bash
nano cybervestigio-n8n.yaml
```

Contenido recomendado:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: n8n-pvc
  namespace: cybervestigio
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: n8n
  namespace: cybervestigio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: n8n
  template:
    metadata:
      labels:
        app: n8n
    spec:
      securityContext:
        fsGroup: 1000
      containers:
        - name: n8n
          image: n8nio/n8n:latest
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
          ports:
            - containerPort: 5678
          env:
            - name: N8N_HOST
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: N8N_HOST
            - name: N8N_PORT
              value: "5678"
            - name: N8N_PROTOCOL
              value: https
            - name: N8N_EDITOR_BASE_URL
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: N8N_EDITOR_BASE_URL
            - name: WEBHOOK_URL
              valueFrom:
                configMapKeyRef:
                  name: cybervestigio-config
                  key: N8N_WEBHOOK_URL
            - name: N8N_BASIC_AUTH_ACTIVE
              value: "true"
            - name: N8N_BASIC_AUTH_USER
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: N8N_BASIC_AUTH_USER
            - name: N8N_BASIC_AUTH_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: N8N_BASIC_AUTH_PASSWORD
            - name: N8N_ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: cybervestigio-secrets
                  key: N8N_ENCRYPTION_KEY
            - name: N8N_PROXY_HOPS
              value: "1"
            - name: GENERIC_TIMEZONE
              value: America/Bogota
            - name: TZ
              value: America/Bogota
          volumeMounts:
            - name: n8n-data
              mountPath: /home/node/.n8n
      volumes:
        - name: n8n-data
          persistentVolumeClaim:
            claimName: n8n-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: n8n-service
  namespace: cybervestigio
spec:
  selector:
    app: n8n
  ports:
    - port: 5678
      targetPort: 5678
```

Aplicar:

```bash
kubectl apply -f cybervestigio-n8n.yaml
```

Validar:

```bash
kubectl get pods -n cybervestigio
kubectl logs -n cybervestigio deploy/n8n
kubectl describe pod -n cybervestigio -l app=n8n
```

---

## 18. Crear Ingress para dominios

Crear archivo:

```bash
nano cybervestigio-ingress.yaml
```

Contenido:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cybervestigio-ingress
  namespace: cybervestigio
spec:
  ingressClassName: nginx
  rules:
    - host: cybervestigio.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 3000
    - host: www.cybervestigio.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 3000
    - host: api.cybervestigio.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 4000
    - host: n8n.cybervestigio.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: n8n-service
                port:
                  number: 5678
```

Aplicar:

```bash
kubectl apply -f cybervestigio-ingress.yaml
```

Validar:

```bash
kubectl get ingress -n cybervestigio
kubectl describe ingress cybervestigio-ingress -n cybervestigio
```

---

## 19. Orden correcto de despliegue

Desde `~/cybervestigio/k8s`:

```bash
kubectl create namespace cybervestigio --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f cybervestigio-config.yaml
kubectl apply -f cybervestigio-data.yaml

kubectl rollout status deployment/postgres -n cybervestigio --timeout=180s
kubectl rollout status deployment/redis -n cybervestigio --timeout=180s

kubectl apply -f cybervestigio-apps.yaml
kubectl apply -f cybervestigio-n8n.yaml
kubectl apply -f cybervestigio-ingress.yaml
```

---

## 20. Verificación general

```bash
kubectl get all -n cybervestigio
kubectl get ingress -n cybervestigio
kubectl get endpoints -n cybervestigio
kubectl get pvc -n cybervestigio
```

Logs:

```bash
kubectl logs -n cybervestigio deploy/api
kubectl logs -n cybervestigio deploy/web
kubectl logs -n cybervestigio deploy/mailer
kubectl logs -n cybervestigio deploy/n8n
```

Pruebas HTTP:

```bash
curl -H "Host: cybervestigio.com" http://69.164.244.72

curl -H "Host: api.cybervestigio.com" http://69.164.244.72/api/v1/health

curl -H "Host: n8n.cybervestigio.com" http://69.164.244.72
```

Resultado esperado para API health:

```json
{"status":"ok","service":"cybervestigio-api","timestamp":"..."}
```

---

## 21. DNS

En el proveedor del dominio crear registros tipo `A`:

```text
cybervestigio.com        A        69.164.244.72
www.cybervestigio.com    A        69.164.244.72
api.cybervestigio.com    A        69.164.244.72
n8n.cybervestigio.com    A        69.164.244.72
```

Validar DNS:

```bash
dig cybervestigio.com +short
dig api.cybervestigio.com +short
dig n8n.cybervestigio.com +short
```

---

## 22. Diagnóstico de errores comunes

### 22.1 Namespace no existe

Error:

```text
namespaces "cybervestigio" not found
```

Solución:

```bash
kubectl create namespace cybervestigio --dry-run=client -o yaml | kubectl apply -f -
```

---

### 22.2 Ingress responde 404

Si:

```bash
curl -H "Host: cybervestigio.com" http://69.164.244.72
```

responde:

```html
404 Not Found
nginx
```

Significa que llegaste al NGINX Ingress Controller, pero no existe una regla Ingress para ese host o el host no coincide.

Verificar:

```bash
kubectl get ingress -A
kubectl describe ingress cybervestigio-ingress -n cybervestigio
```

---

### 22.3 Ingress responde 503

Si `n8n.cybervestigio.com` responde:

```html
503 Service Temporarily Unavailable
nginx
```

Significa que el Ingress existe, pero el Service no tiene endpoints listos.

Verificar:

```bash
kubectl get pods -n cybervestigio
kubectl get endpoints -n cybervestigio
kubectl describe pod -n cybervestigio -l app=n8n
kubectl logs -n cybervestigio deploy/n8n
```

---

### 22.4 API no conecta a PostgreSQL

Verificar:

```bash
kubectl logs -n cybervestigio deploy/api
kubectl get svc -n cybervestigio
kubectl get pods -n cybervestigio -l app=postgres
```

Revisar `DATABASE_URL` en `cybervestigio-apps.yaml`.

Debe apuntar a:

```text
postgres-service:5432
```

---

### 22.5 Mailer falla con SMTP

Error típico:

```text
Invalid login: 535 5.7.8 Error: authentication failed
```

Solución:

1. Corregir `SMTP_USER`.
2. Corregir `SMTP_PASS`.
3. Validar que sea clave SMTP real, no contraseña inválida.
4. Aplicar secret otra vez.
5. Reiniciar mailer.

```bash
kubectl apply -f cybervestigio-config.yaml
kubectl rollout restart deployment/mailer -n cybervestigio
kubectl logs -n cybervestigio deploy/mailer
```

---

### 22.6 Docker build falla con apt o npm por certificados

Errores posibles:

```text
DEPTH_ZERO_SELF_SIGNED_CERT
The repository 'http://deb.debian.org/debian bookworm Release' does not have a Release file
```

Causa probable: reglas iptables genéricas redirigiendo todo HTTP/HTTPS al Ingress.

Verificar:

```bash
sudo iptables -t nat -S PREROUTING
```

Eliminar reglas genéricas sin `-d 69.164.244.72`.

---

## 23. Comandos útiles de operación

### Ver todo

```bash
kubectl get all -n cybervestigio
```

### Reiniciar un deployment

```bash
kubectl rollout restart deployment/api -n cybervestigio
kubectl rollout restart deployment/web -n cybervestigio
kubectl rollout restart deployment/mailer -n cybervestigio
kubectl rollout restart deployment/n8n -n cybervestigio
```

### Ver estado de rollout

```bash
kubectl rollout status deployment/api -n cybervestigio
kubectl rollout status deployment/web -n cybervestigio
kubectl rollout status deployment/n8n -n cybervestigio
```

### Entrar a un pod

```bash
kubectl exec -it -n cybervestigio deploy/api -- sh
```

### Ver eventos

```bash
kubectl get events -n cybervestigio --sort-by=.lastTimestamp | tail -50
```

### Describir Ingress

```bash
kubectl describe ingress cybervestigio-ingress -n cybervestigio
```

---

## 24. Actualizar versión del proyecto

Flujo recomendado:

```bash
cd ~/cybervestigio
git pull origin master

docker build -t cybervestigio-api:local -f apps/api/Dockerfile.prod apps/api
docker build -t cybervestigio-web:local -f apps/web/Dockerfile.prod apps/web
docker build -t cybervestigio-mailer:local -f apps/mailer/Dockerfile.prod apps/mailer

minikube image load cybervestigio-api:local
minikube image load cybervestigio-web:local
minikube image load cybervestigio-mailer:local

kubectl rollout restart deployment/api -n cybervestigio
kubectl rollout restart deployment/web -n cybervestigio
kubectl rollout restart deployment/mailer -n cybervestigio
```

Verificar:

```bash
kubectl get pods -n cybervestigio
kubectl logs -n cybervestigio deploy/api
kubectl logs -n cybervestigio deploy/web
```

---

## 25. Instalar HTTPS con cert-manager

Cuando HTTP ya funcione, instalar `cert-manager`.

### 25.1 Instalar cert-manager

```bash
helm install cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Validar:

```bash
kubectl get pods -n cert-manager
```

### 25.2 Crear ClusterIssuer

```bash
nano letsencrypt-prod.yaml
```

Contenido:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: contacto@cybervestigio.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

Aplicar:

```bash
kubectl apply -f letsencrypt-prod.yaml
```

### 25.3 Actualizar Ingress con TLS

Agregar anotación y bloque `tls`:

```yaml
metadata:
  name: cybervestigio-ingress
  namespace: cybervestigio
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - cybervestigio.com
        - www.cybervestigio.com
        - api.cybervestigio.com
        - n8n.cybervestigio.com
      secretName: cybervestigio-tls
```

Aplicar:

```bash
kubectl apply -f cybervestigio-ingress.yaml
kubectl get certificate -n cybervestigio
```

---

## 26. Seguridad pendiente antes de producción real

Antes de usar el sitio con clientes reales:

1. Rotar todas las credenciales expuestas.
2. No subir `.env` ni `.env.prod` al repositorio.
3. Usar claves robustas para:
   - `JWT_SECRET`
   - `POSTGRES_PASSWORD`
   - `ADMIN_INITIAL_PASSWORD`
   - `N8N_ENCRYPTION_KEY`
   - `SMTP_PASS`
4. Activar HTTPS.
5. Configurar backups de PostgreSQL.
6. Proteger n8n con usuario/contraseña y HTTPS.
7. Agregar rate limiting o WAF.
8. Monitorear logs y consumo de recursos.
9. Validar política de tratamiento de datos antes de captar datos reales.
10. Configurar alertas de caída para web, API, postgres y redis.

---

## 27. Estado logrado en la prueba

Durante la prueba real del despliegue se obtuvo:

```text
cybervestigio.com
  OK: devuelve HTML del sitio Next.js.

api.cybervestigio.com/api/v1/health
  OK: devuelve {"status":"ok","service":"cybervestigio-api",...}

mailer
  Worker activo, pero SMTP con error de autenticación hasta corregir SMTP_*.

n8n.cybervestigio.com
  En diagnóstico: si devuelve 503, revisar pod n8n y endpoints.
```

---

## 28. Comando rápido de diagnóstico final

```bash
echo "=== NODES ==="
kubectl get nodes

echo "=== INGRESS CONTROLLER ==="
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx

echo "=== CYBERVESTIGIO ==="
kubectl get all -n cybervestigio
kubectl get ingress -n cybervestigio
kubectl get endpoints -n cybervestigio
kubectl get pvc -n cybervestigio

echo "=== TESTS ==="
curl -I -H "Host: cybervestigio.com" http://69.164.244.72
curl -H "Host: api.cybervestigio.com" http://69.164.244.72/api/v1/health
curl -I -H "Host: n8n.cybervestigio.com" http://69.164.244.72
```

---

## 29. Resumen final

El despliegue completo queda compuesto por:

```text
Docker Engine
kubectl
Minikube
Helm
NGINX Ingress Controller
iptables DNAT hacia NodePorts de Minikube
Namespace cybervestigio
Secret cybervestigio-secrets
ConfigMap cybervestigio-config
Deployments:
  - postgres
  - redis
  - api
  - web
  - mailer
  - n8n
Services:
  - postgres-service
  - redis-service
  - api-service
  - web-service
  - n8n-service
Ingress:
  - cybervestigio-ingress
```

Con esto se puede publicar una plataforma multi-servicio en Kubernetes usando varios hosts:

```text
cybervestigio.com
www.cybervestigio.com
api.cybervestigio.com
n8n.cybervestigio.com
```
