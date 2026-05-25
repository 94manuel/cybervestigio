# Flujo base de chat con n8n

Este proyecto incluye un flujo inicial para el widget de chat del sitio en `docs/n8n-chat-workflow.json`.

## Qué hace

- Expone el webhook `POST /webhook/cybervestigio-chat`.
- Recibe el contrato que envía `apps/web/src/app/api/chat/route.ts`.
- Responde JSON con una clave `reply`, compatible con el frontend.
- Entrega respuestas base sobre metodología, preservación, cadena de custodia y contacto.

## Importación en n8n

1. Levante n8n: `docker compose up -d n8n`
2. Abra `http://localhost:5678`
3. Importe `docs/n8n-chat-workflow.json`
4. Active o publique el workflow importado desde la UI
5. Reconstruya la web si corre en Docker: `docker compose up -d --build web`

## Nota sobre activación local

En esta instalación local, la importación por CLI deja el workflow cargado pero el webhook de producción puede seguir sin registrarse hasta que se abra el workflow en la UI y se confirme su estado publicado/activo una vez desde el editor.

La URL de producción esperada es:

```text
http://localhost:5678/webhook/cybervestigio-chat
```

## Contrato de entrada esperado

```json
{
  "message": "¿Cómo documentan la cadena de custodia?",
  "sessionId": "uuid",
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

## Respuesta mínima

```json
{
  "reply": "Texto visible para el usuario."
}
```

## Siguiente mejora recomendada

Sustituya el nodo `Build Reply` por un flujo con base de conocimiento, AI Agent o integración con modelos externos, manteniendo la salida final en `reply`.
