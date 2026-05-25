import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CyberVestigio | Informática forense y evidencia digital',
    template: '%s | CyberVestigio',
  },
  description:
    'Investigación ciberforense, preservación de evidencia digital y documentación de cadena de custodia.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
