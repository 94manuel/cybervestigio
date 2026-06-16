import type { ReactNode } from 'react';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { requireClientToken } from '@/lib/session';
import { clientLogoutAction } from './actions';

export default async function ClientPortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireClientToken();

  return (
    <>
      <SiteHeader />
      <main className="content-section">
        <div className="container client-shell">
          <aside className="client-sidebar admin-card">
            <h2>Portal cliente</h2>
            <nav className="client-nav">
              <Link href="/cuenta">Resumen</Link>
              <Link href="/cuenta/servicios">Servicios</Link>
              <Link href="/cuenta/carrito">Carrito y pago</Link>
              <Link href="/cuenta/drive">Drive de expedientes</Link>
            </nav>
            <form className="logout-form" action={clientLogoutAction}>
              <button type="submit">Cerrar sesión</button>
            </form>
          </aside>
          <section className="client-main">{children}</section>
        </div>
      </main>
      <SiteFooter showChat={false} />
    </>
  );
}
