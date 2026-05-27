import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { logoutAction } from '@/app/admin/(panel)/actions';

export function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <Logo compact />
      <nav className="admin-nav" aria-label="Administración">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/usuarios">Usuarios</Link>
        <Link href="/admin/clientes">Clientes</Link>
        <Link href="/admin/facturas">Facturas</Link>
        <Link href="/admin/cobros">Cobros</Link>
        <Link href="/admin/contactos">Contactos</Link>
        <Link href="/admin/servicios">Servicios</Link>
        <Link href="/admin/configuracion">Configuración</Link>
        <Link href="/" target="_blank">Ver sitio</Link>
      </nav>
      <form className="logout-form" action={logoutAction}>
        <button type="submit">Cerrar sesión</button>
      </form>
    </aside>
  );
}
