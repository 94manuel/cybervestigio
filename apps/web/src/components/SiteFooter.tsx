import Link from 'next/link';
import { getHomeData } from '@/lib/api';
import { ChatWidgetMount } from './ChatWidgetMount';
import { Logo } from './Logo';

export async function SiteFooter({ showChat = true }: Readonly<{ showChat?: boolean }>) {
  const { settings } = await getHomeData();
  const chatEnabled = Boolean(process.env.N8N_CHAT_WEBHOOK_URL);

  return (
    <>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Logo compact />
            <p className="footer-copy">
              Investigación forense digital y documentación técnica para orientar la preservación de evidencias tecnológicas.
            </p>
          </div>
          <div>
            <h3>Navegación</h3>
            <Link href="/servicios">Servicios</Link>
            <Link href="/metodologia">Metodología</Link>
            <Link href="/contacto">Contacto</Link>
            <Link href="/politica-de-privacidad">Política de datos</Link>
          </div>
          <div>
            <h3>Contacto</h3>
            <p>{settings.contactEmail}</p>
            <p>{settings.location}</p>
            <Link className="admin-link" href="/admin/login">Acceso administrativo</Link>
          </div>
        </div>
        <div className="footer-bottom">© 2026 CyberVestigio. Evidencia digital y análisis forense.</div>
      </footer>
      {showChat ? <ChatWidgetMount enabled={chatEnabled} /> : null}
    </>
  );
}
