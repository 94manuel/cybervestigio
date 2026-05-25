'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

type ChatRole = 'assistant' | 'user';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface ChatReply {
  reply?: string;
  error?: string;
  sessionId?: string;
}

const STORAGE_MESSAGES_KEY = 'cybervestigio-chat-messages';
const STORAGE_SESSION_KEY = 'cybervestigio-chat-session';
const quickQuestions = [
  '¿Cómo es el proceso de preservación de evidencia digital?',
  '¿Qué información debo tener lista antes de contactarlos?',
  '¿Cómo documentan la cadena de custodia?',
];

const welcomeMessage: ChatMessage = {
  id: 'chat-welcome',
  role: 'assistant',
  content:
    'Hola. Soy el asistente de CyberVestigio. Puedo orientarte sobre metodología, cadena de custodia, alcance del servicio y pasos iniciales del proceso.',
};

export function N8nChatWidget({ enabled }: Readonly<{ enabled: boolean }>) {
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const storedMessages = readStoredMessages();
    return storedMessages.length > 0 ? storedMessages : [welcomeMessage];
  });
  const [sessionId, setSessionId] = useState(() => ensureSessionId());
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    try {
      window.localStorage.setItem(
        STORAGE_MESSAGES_KEY,
        JSON.stringify(messages.slice(-20)),
      );
    } catch {
      // Ignora errores de persistencia local.
    }
  }, [enabled, messages]);

  useEffect(() => {
    if (!isOpen) return;

    messagesViewportRef.current?.scrollTo({
      top: messagesViewportRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [isOpen, messages]);

  if (!enabled) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await sendMessage(input);
  }

  async function sendMessage(rawMessage: string): Promise<void> {
    const content = rawMessage.trim();
    if (!content || isSending) return;

    const activeSessionId = sessionId || ensureSessionId();
    if (!sessionId) setSessionId(activeSessionId);

    const userMessage = buildMessage('user', content);
    const nextMessages = [...messages, userMessage];

    setIsOpen(true);
    setError(null);
    setInput('');
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId: activeSessionId,
          path: getCurrentPath(),
          history: nextMessages.slice(-12).map(({ role, content: text }) => ({
            role,
            content: text,
          })),
        }),
      });

      const data = (await response.json().catch(() => null)) as ChatReply | null;
      if (!response.ok || !data?.reply) {
        throw new Error(data?.error ?? 'No fue posible obtener una respuesta del asistente.');
      }

      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((current) => [...current, buildMessage('assistant', data.reply ?? '')]);
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : 'Ocurrió un problema al consultar el flujo conversacional.';

      setError(nextError);
      setMessages((current) => [
        ...current,
        buildMessage(
          'assistant',
          'No pude responder en este momento. Intenta de nuevo en unos segundos o usa el formulario de contacto si necesitas dejar el caso documentado.',
        ),
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function resetConversation(): void {
    const nextSessionId = createSessionId();

    setSessionId(nextSessionId);
    setMessages([welcomeMessage]);
    setInput('');
    setError(null);

    try {
      window.localStorage.setItem(STORAGE_SESSION_KEY, nextSessionId);
      window.localStorage.removeItem(STORAGE_MESSAGES_KEY);
    } catch {
      // Ignora errores de persistencia local.
    }
  }

  return (
    <div className="chat-widget">
      {isOpen ? (
        <section className="chat-panel" id="cybervestigio-chat-panel" aria-label="Chat de CyberVestigio">
          <header className="chat-panel__header">
            <div>
              <p>Asistente conectado con n8n</p>
              <strong>Resuelve dudas sobre el proceso y la evidencia digital</strong>
            </div>
            <div className="chat-panel__actions">
              <button className="chat-panel__ghost" type="button" onClick={resetConversation}>
                Reiniciar
              </button>
              <button
                className="chat-panel__close"
                type="button"
                aria-label="Cerrar chat"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
          </header>

          <div className="chat-messages" ref={messagesViewportRef}>
            {messages.map((message) => (
              <div className={`chat-message chat-message--${message.role}`} key={message.id}>
                <div className={`chat-bubble chat-bubble--${message.role}`}>
                  {message.content}
                </div>
              </div>
            ))}

            {messages.length === 1 ? (
              <div className="chat-suggestions">
                {quickQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => void sendMessage(question)}>
                    {question}
                  </button>
                ))}
              </div>
            ) : null}

            {isSending ? (
              <div className="chat-message chat-message--assistant">
                <div className="chat-bubble chat-bubble--typing">
                  Analizando tu consulta...
                </div>
              </div>
            ) : null}
          </div>

          {error ? <p className="chat-panel__error">{error}</p> : null}

          <form className="chat-form" onSubmit={handleSubmit}>
            <input
              aria-label="Escribe tu pregunta"
              disabled={isSending}
              maxLength={1000}
              name="message"
              placeholder="Pregunta por metodología, tiempos, custodia o documentación"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button disabled={isSending || !input.trim()} type="submit">
              {isSending ? 'Enviando...' : 'Enviar'}
            </button>
          </form>

          <p className="chat-panel__note">
            El asistente ofrece orientación inicial. Para un caso real, preserve la evidencia y use el canal de contacto formal.
          </p>
        </section>
      ) : null}

      <button
        aria-controls="cybervestigio-chat-panel"
        aria-expanded={isOpen}
        className="chat-toggle"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="chat-toggle__label">
          {isOpen ? 'Ocultar asistente' : 'Preguntar al asistente'}
        </span>
        <span className="chat-toggle__icon">•••</span>
      </button>
    </div>
  );
}

function readStoredMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];

  try {
    const rawValue = window.localStorage.getItem(STORAGE_MESSAGES_KEY);
    if (!rawValue) return [];

    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];

      const entry = item as Record<string, unknown>;
      const role = entry.role;
      const content = entry.content;
      const id = entry.id;

      if (
        (role === 'assistant' || role === 'user') &&
        typeof content === 'string' &&
        content.trim() &&
        typeof id === 'string'
      ) {
        return [{ id, role, content: content.trim() }];
      }

      return [];
    });
  } catch {
    return [];
  }
}

function ensureSessionId(): string {
  if (typeof window === 'undefined') return createSessionId();

  try {
    const currentValue = window.localStorage.getItem(STORAGE_SESSION_KEY);
    if (currentValue) return currentValue;

    const nextValue = createSessionId();
    window.localStorage.setItem(STORAGE_SESSION_KEY, nextValue);
    return nextValue;
  } catch {
    return createSessionId();
  }
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `cv-chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  };
}

function getCurrentPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
}