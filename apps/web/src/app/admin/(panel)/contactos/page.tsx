import type { Metadata } from 'next';
import { getAdminContacts } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';
import { updateContactStatusAction } from './actions';

export const metadata: Metadata = { title: 'Solicitudes de contacto' };

const statusLabel = { NEW: 'Nuevo', IN_REVIEW: 'En revisión', ATTENDED: 'Atendido', ARCHIVED: 'Archivado' };
function dateFormat(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default async function ContactsAdminPage() {
  const token = await requireAdminToken();
  const contacts = await getAdminContacts(token);
  return (
    <>
      <header className="admin-heading"><div><h1>Solicitudes de contacto</h1><p>Gestione los mensajes enviados desde el formulario público.</p></div></header>
      <section className="admin-card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Solicitante</th><th>Servicio / mensaje</th><th>Fecha</th><th>Estado actual</th><th>Actualizar</th></tr></thead>
            <tbody>
              {contacts.length === 0 && <tr><td colSpan={5}>No existen solicitudes registradas.</td></tr>}
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td><strong>{contact.fullName}</strong>{contact.email}<br />{contact.phone ?? ''}<br />{contact.company ?? ''}</td>
                  <td><strong>{contact.service}</strong>{contact.message}</td>
                  <td>{dateFormat(contact.createdAt)}</td>
                  <td><span className={`tag tag--${contact.status}`}>{statusLabel[contact.status]}</span></td>
                  <td>
                    <form className="inline-form" action={updateContactStatusAction}>
                      <input type="hidden" name="id" value={contact.id} />
                      <select name="status" defaultValue={contact.status} aria-label="Estado">
                        <option value="NEW">Nuevo</option>
                        <option value="IN_REVIEW">En revisión</option>
                        <option value="ATTENDED">Atendido</option>
                        <option value="ARCHIVED">Archivado</option>
                      </select>
                      <button className="button button--outline button--small" type="submit">Guardar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
