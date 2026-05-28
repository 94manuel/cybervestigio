# CyberVestigio — Plataforma web y panel administrativo

Proyecto funcional base para la presencia digital de **CyberVestigio**, orientada a servicios de informática forense, preservación de evidencia digital y cadena de custodia.

## Entregables incluidos

- **Frontend Next.js** con App Router y renderizado dinámico en servidor (SSR) para las páginas públicas y el panel administrativo.
- **Backend NestJS** con API REST, autenticación JWT, documentación Swagger y validación de solicitudes.
- **PostgreSQL + Prisma ORM** para almacenar contactos, servicios, contenido corporativo y usuarios administrativos.
- **Chat web integrado con n8n** para responder preguntas sobre metodología, procesos y orientación inicial desde el sitio público.
- **Panel administrativo** protegido para revisar contactos, cambiar estados, administrar servicios y editar el contenido principal del sitio.
- **Identidad visual aplicada** con el logo suministrado y la paleta institucional de CyberVestigio.
- Docker Compose para la base de datos y migración inicial lista para ejecutar.

## Arquitectura

```text
cybervestigio-platform/
├── apps/
│   ├── web/            # Next.js: sitio SSR y panel admin
│   └── api/            # NestJS: API, auth, Prisma, Swagger
├── docs/               # arquitectura y API
├── docker-compose.yml  # PostgreSQL local
└── package.json        # workspace raíz
```

Las vistas de Next.js consultan la API NestJS desde el servidor utilizando `cache: "no-store"` y `dynamic = "force-dynamic"`. De esta manera, home, servicios y panel reciben información actual en cada solicitud sin exponer la comunicación privada del backend al navegador.

## Paleta aplicada

| Uso | HEX |
|---|---|
| Azul CyberVestigio Oscuro | `#001A47` |
| Azul CyberVestigio Digital | `#0A92D3` |
| Plata Forense | `#8491A0` |
| Blanco Evidencia | `#FFFFFF` |
| Fondo técnico claro | `#EFF8FC` |
| Encabezados suaves | `#DCEFF7` |

## Requisitos

- Node.js 20.19 o superior, requerido por Prisma ORM 7
- npm 10 o superior
- Docker Desktop o una instalación local de PostgreSQL

## Puesta en marcha local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Iniciar servicios base

```bash
docker compose up -d postgres redis n8n
```

### 3. Configurar variables de entorno

En macOS o Linux:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mailer/.env.example apps/mailer/.env
cp apps/web/.env.example apps/web/.env.local
```

En Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/mailer/.env.example apps/mailer/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Antes de producción, cambie obligatoriamente `JWT_SECRET`, `ADMIN_INITIAL_PASSWORD`, las credenciales de la base de datos y la clave SMTP real de la cuenta de correo.

### 3.1. Configurar correo saliente

La API ya no envia correos directamente. Ahora encola jobs en Redis y el microservicio `mailer` consume esa cola y entrega por SMTP. Configure:

En `apps/api/.env`:

```env
REDIS_URL=redis://localhost:6379
MAIL_QUEUE_NAME=cybervestigio-mail
```

En `apps/mailer/.env`:

```env
REDIS_URL=redis://localhost:6379
MAIL_QUEUE_NAME=cybervestigio-mail
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contacto@cybervestigio.com
SMTP_PASS=coloque-aqui-la-clave-real
SMTP_FROM=contacto@cybervestigio.com
```

El dato IMAP (`imap.hostinger.com`) sirve para clientes de correo, no para los envios salientes del microservicio.

Si ejecuta la plataforma con `docker compose`, copie `REDIS_URL`, `MAIL_QUEUE_NAME` y las variables `SMTP_*` en el `.env` raiz o en `.env.prod`. El `api` usa `REDIS_URL` y `MAIL_QUEUE_NAME`; el `mailer` usa ambas y ademas `SMTP_*`.

Si alguna clave en `.env.prod` empieza por `$`, dejela entre comillas simples para que Docker Compose la trate como valor literal y no la expanda como variable.

### 3.2. Configurar el chat con n8n

En `apps/web/.env.local` configure el webhook del flujo conversacional:

```env
N8N_CHAT_WEBHOOK_URL=http://localhost:5678/webhook/cybervestigio-chat
N8N_CHAT_WEBHOOK_TOKEN=
```

Si ejecuta el sitio con Docker Compose, declare las mismas variables en el `.env` raíz para que lleguen al contenedor `web`.

Si usa el `docker-compose.yml` de este proyecto, el valor recomendado en el `.env` raíz es:

```env
N8N_CHAT_WEBHOOK_URL=http://n8n:5678/webhook/cybervestigio-chat
```

La interfaz local de n8n queda disponible en `http://localhost:5678`.

El frontend envía a n8n un `POST` JSON con este formato base:

```json
{
	"message": "¿Cómo documentan la cadena de custodia?",
	"sessionId": "uuid-o-token-de-sesion",
	"history": [
		{ "role": "assistant", "content": "..." },
		{ "role": "user", "content": "..." }
	],
	"source": "cybervestigio-web",
	"currentPath": "/metodologia",
	"requestedAt": "2026-05-24T00:00:00.000Z",
	"siteUrl": "http://localhost:3000"
}
```

La respuesta de n8n puede ser texto plano o JSON con alguna de estas claves: `reply`, `message`, `text`, `answer`, `output`, `response` o `content`.

En este repositorio también queda un flujo base importable en `docs/n8n-chat-workflow.json` y una guía rápida en `docs/n8n-chat.md`.

### 4. Crear la base y datos iniciales

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Ejecutar API y frontend

En dos terminales:

```bash
npm run dev:api
npm run dev:web
```

| Aplicación | Dirección local |
|---|---|
| Sitio web | `http://localhost:3000` |
| Panel administrativo | `http://localhost:3000/admin/login` |
| API | `http://localhost:4000/api/v1` |
| Swagger | `http://localhost:4000/docs` |

### Acceso administrativo inicial

Los valores se configuran en `apps/api/.env`:

```env
ADMIN_INITIAL_EMAIL=admin@cybervestigio.co
ADMIN_INITIAL_PASSWORD=Cambiar-Esta-Clave-123!
```

Los envios de facturas y cualquier otro correo del backend deben pasar por la cola Redis y el microservicio `mailer`.

## Páginas implementadas

### Sitio público

- Inicio corporativo con hero, servicios, metodología, principios de evidencia y llamado a contacto.
- Servicios.
- Metodología forense.
- Nosotros.
- Contacto con formulario persistido en PostgreSQL.
- Política de tratamiento de datos como texto inicial editable para revisión jurídica.

### Panel administrativo

- Inicio de sesión con JWT almacenado en cookie `httpOnly` desde Next.js.
- Dashboard con indicadores de solicitudes.
- Gestión de contactos y actualización de estados: nuevo, en revisión, atendido y archivado.
- Gestión de servicios: creación, edición, activación y eliminación.
- Configuración del contenido principal: título, subtítulo, correo, teléfono y ubicación.

## Seguridad incluida y decisiones para producción

Implementado en esta base:

- Contraseñas cifradas con `bcryptjs`.
- Autenticación JWT para endpoints administrativos.
- Cookie administrativa `httpOnly` y `sameSite=lax` en el frontend.
- Validación y transformación de DTOs mediante `class-validator`.
- Cabeceras HTTP reforzadas mediante `helmet`.
- CORS limitado mediante variable `FRONTEND_URL`.
- Campo honeypot en el formulario público de contacto.

Antes de publicar el sitio se debe incorporar: HTTPS obligatorio, gestor de secretos, CAPTCHA o protección antibots, rate limiting/WAF, registros de auditoría administrativa, respaldo cifrado de base de datos, política jurídica validada y monitoreo.

## Despliegue en VPS con Docker Compose

Para una VPS use el archivo `docker-compose.prod.yml`, no el `docker-compose.yml` de desarrollo.

1. Cree el archivo de variables desde la plantilla:

```bash
cp .env.prod.example .env.prod
```

2. Ajuste en `.env.prod` las claves de PostgreSQL, JWT, admin inicial y n8n, además de los dominios reales del sitio y de n8n.

3. Levante el stack de producción:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

4. Verifique estado y logs:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api web n8n
```

El stack de producción expone `web` y `n8n` solo en `127.0.0.1`, deja `postgres` y `api` en red interna de Docker y ejecuta Next.js y NestJS en modo `production`.

## Consideración forense y legal

Los textos del sitio evitan afirmar certificaciones, acreditaciones o calidad de perito judicial que no hayan sido formalmente obtenidas. La política de datos incorporada es una plantilla inicial; debe ser revisada antes de captar información real de clientes.

## Tecnologías

- Next.js App Router + TypeScript
- NestJS + Swagger + JWT
- Prisma ORM 7 + PostgreSQL
- CSS corporativo responsive sin dependencia de un kit visual externo


## Verificación realizada en la entrega

- El frontend fue validado con `npm run lint --workspace=@cybervestigio/web` y `npm run build --workspace=@cybervestigio/web`. Las páginas del sitio y del panel se compilaron como rutas dinámicas renderizadas en servidor.
- El backend, la migración y la semilla están implementados con Prisma ORM 7 y el adaptador PostgreSQL. En el entorno de generación del entregable no fue posible descargar el motor de Prisma porque el dominio de binarios de Prisma no resolvió desde la red del entorno. Por esta razón, el cliente generado se crea al ejecutar `npm run db:generate` en el equipo de desarrollo con acceso a internet, antes de compilar o iniciar la API.

n8n quedó en http://localhost:5678.

Usuario: admin@cybervestigio.localr
Clave: CybervestigioN8n2026!