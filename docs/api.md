# API REST — Endpoints principales

Prefijo base: `/api/v1`

| Método | Endpoint | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/health` | Público | Estado de la API. |
| `GET` | `/site/home` | Público | Contenido de inicio y servicios visibles. |
| `GET` | `/site/services` | Público | Catálogo visible de servicios. |
| `POST` | `/contacts` | Público | Registrar una solicitud de contacto. |
| `POST` | `/auth/login` | Público | Autenticar administrador. |
| `GET` | `/admin/dashboard` | JWT | Indicadores generales. |
| `GET` | `/admin/contacts` | JWT | Listar solicitudes. |
| `PATCH` | `/admin/contacts/:id/status` | JWT | Actualizar estado. |
| `GET` | `/admin/services` | JWT | Listar todos los servicios. |
| `POST` | `/admin/services` | JWT | Crear servicio. |
| `PATCH` | `/admin/services/:id` | JWT | Editar servicio. |
| `DELETE` | `/admin/services/:id` | JWT | Eliminar servicio. |
| `GET` | `/admin/settings` | JWT | Consultar configuración. |
| `PATCH` | `/admin/settings` | JWT | Editar configuración. |

La especificación ejecutable se publica mediante Swagger en `/docs` al levantar la API.
