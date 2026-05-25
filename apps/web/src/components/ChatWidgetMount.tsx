'use client';

import dynamic from 'next/dynamic';

const N8nChatWidget = dynamic(
  () => import('./N8nChatWidget').then((module) => module.N8nChatWidget),
  { ssr: false },
);

export function ChatWidgetMount({ enabled }: Readonly<{ enabled: boolean }>) {
  return <N8nChatWidget enabled={enabled} />;
}