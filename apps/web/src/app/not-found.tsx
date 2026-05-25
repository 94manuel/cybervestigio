import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="page-hero">
        <div className="container">
          <p className="eyebrow">404</p>
          <h1>La página solicitada no fue encontrada.</h1>
          <p>Regrese al sitio principal o contacte a CyberVestigio para recibir orientación.</p>
          <p><Link className="button button--primary" href="/">Volver al inicio</Link></p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
