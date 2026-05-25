import type { Metadata } from 'next';
import Link from 'next/link';
import { getDashboard } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';

export const metadata: Metadata = { title: 'Panel administrativo' };

function dateFormat(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const statusLabel = { NEW: 'Nuevo', IN_REVIEW: 'En revisión', ATTENDED: 'Atendido', ARCHIVED: 'Archivado' };

export default async function AdminDashboardPage() {
  const token = await requireAdminToken();
  const data = await getDashboard(token);
  return (
    <>
      <header className="admin-heading">
        <div><h1>Dashboard</h1><p>Resumen de solicitudes recibidas desde el portal web.</p></div>
        <Link className="button button--primary button--small" href="/admin/contactos">Ver solicitudes</Link>
      </header>
      <section className="metrics-grid">
        <article className="metric-card"><span>Total de contactos</span><strong>{data.metrics.total}</strong></article>
        <article className="metric-card"><span>Nuevos</span><strong>{data.metrics.newContacts}</strong></article>
        <article className="metric-card"><span>En revisión</span><strong>{data.metrics.reviewing}</strong></article>
        <article className="metric-card"><span>Atendidos</span><strong>{data.metrics.attended}</strong></article>
      </section>
      <section className="admin-card">
        <h2>Últimas solicitudes</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Contacto</th><th>Servicio</th><th>Fecha</th><th>Estado</th></tr></thead>
            <tbody>
              {data.latest.length === 0 && <tr><td colSpan={4}>Aún no existen solicitudes registradas.</td></tr>}
              {data.latest.map((contact) => (
                <tr key={contact.id}>
                  <td><strong>{contact.fullName}</strong>{contact.email}</td>
                  <td>{contact.service}</td>
                  <td>{dateFormat(contact.createdAt)}</td>
                  <td><span className={`tag tag--${contact.status}`}>{statusLabel[contact.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
