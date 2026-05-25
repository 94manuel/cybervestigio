import { NextRequest, NextResponse } from 'next/server';

type ChatRole = 'assistant' | 'user';

interface ChatHistoryItem {
  role: ChatRole;
  content: string;
}

interface IncomingChatRequest {
  message?: unknown;
  sessionId?: unknown;
  history?: unknown;
  path?: unknown;
}

const replyKeys = ['reply', 'message', 'text', 'answer', 'output', 'response', 'content'] as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'El chat no está configurado todavía.' },
      { status: 503 },
    );
  }

  let body: IncomingChatRequest;
  try {
    body = (await request.json()) as IncomingChatRequest;
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'El mensaje es obligatorio.' }, { status: 400 });
  }

  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId.trim().length > 0
      ? body.sessionId.trim()
      : `cv-chat-${Date.now()}`;

  const history = Array.isArray(body.history)
    ? body.history.flatMap(normalizeHistoryItem).slice(-12)
    : [];

  const currentPath = typeof body.path === 'string' ? body.path : '/';
  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain;q=0.9',
    'Content-Type': 'application/json',
  };

  const token = process.env.N8N_CHAT_WEBHOOK_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  let upstream: Response;
  try {
    upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify({
        message,
        sessionId,
        history,
        source: 'cybervestigio-web',
        currentPath,
        requestedAt: new Date().toISOString(),
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: 'No fue posible conectar el chat con n8n.' },
      { status: 502 },
    );
  }

  const rawBody = await upstream.text();
  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: 'El flujo de n8n devolvió un error.',
        details: rawBody.slice(0, 300),
      },
      { status: 502 },
    );
  }

  const reply = extractReply(rawBody, upstream.headers.get('content-type'));
  if (!reply) {
    return NextResponse.json(
      { error: 'n8n no devolvió una respuesta legible para el chat.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ reply, sessionId });
}

function normalizeHistoryItem(item: unknown): ChatHistoryItem[] {
  if (!item || typeof item !== 'object') return [];

  const entry = item as Record<string, unknown>;
  const role = entry.role;
  const content = entry.content;

  if ((role === 'assistant' || role === 'user') && typeof content === 'string' && content.trim()) {
    return [{ role, content: content.trim() }];
  }

  return [];
}

function extractReply(rawBody: string, contentType: string | null): string | null {
  const trimmed = rawBody.trim();
  if (!trimmed) return null;

  const looksLikeJson =
    contentType?.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[');

  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return findReplyInPayload(parsed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function findReplyInPayload(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findReplyInPayload(item);
      if (found) return found;
    }
    return null;
  }

  if (!payload || typeof payload !== 'object') return null;

  const record = payload as Record<string, unknown>;

  for (const key of replyKeys) {
    const found = findReplyInPayload(record[key]);
    if (found) return found;
  }

  const nestedKeys = ['data', 'result', 'body', 'item'] as const;
  for (const key of nestedKeys) {
    const found = findReplyInPayload(record[key]);
    if (found) return found;
  }

  return null;
}