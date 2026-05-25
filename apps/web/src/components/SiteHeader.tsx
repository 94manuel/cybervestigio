import Link from 'next/link';
import { Logo } from './Logo';

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/metodologia', label: 'Metodología' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-grid">
        <Logo compact />
        <nav className="main-nav" aria-label="Navegación principal">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <Link className="button button--primary header-action" href="/contacto">
          Solicitar análisis
        </Link>
        <details className="mobile-menu">
          <summary aria-label="Abrir menú">☰</summary>
          <nav aria-label="Navegación móvil">
            {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          </nav>
        </details>
      </div>
    </header>
  );
}
