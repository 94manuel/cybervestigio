import type { Metadata } from 'next';
import { getAdminClients } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';
import { createClientAction, updateClientAction } from './actions';

export const metadata: Metadata = { title: 'Clientes' };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const token = await requireAdminToken();
  const { q } = await searchParams;
  const clients = await getAdminClients(token, q);

  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Clientes registrados</h1>
          <p>Registre clientes para facturacion y busqueda por nombre o cedula.</p>
        </div>
      </header>

      <section className="admin-card">
        <h2>Buscar clientes</h2>
        <form className="admin-form-grid" method="GET">
          <div className="field"><label htmlFor="q">Nombre o cedula</label><input id="q" name="q" defaultValue={q ?? ''} /></div>
          <div className="field--full"><button className="button button--outline button--small" type="submit">Buscar</button></div>
        </form>
      </section>

      <section className="admin-card">
        <h2>Crear cliente</h2>
        <form className="admin-form-grid" action={createClientAction}>
          <div className="field"><label>Nombre completo</label><input name="fullName" required /></div>
          <div className="field"><label>Cedula</label><input name="cedula" required /></div>
          <div className="field"><label>Correo</label><input name="email" type="email" required /></div>
          <div className="field"><label>Telefono</label><input name="phone" /></div>
          <div className="field"><label>Empresa</label><input name="company" /></div>
          <div className="field"><label>Activo</label><input name="active" type="checkbox" defaultChecked /></div>
          <div className="field--full"><button className="button button--primary" type="submit">Guardar cliente</button></div>
        </form>
      </section>

      <section className="admin-card">
        <h2>Listado</h2>
        {clients.length === 0 && <p>No hay clientes registrados.</p>}
        {clients.map((client) => (
          <div className="admin-record-card" key={client.id}>
            <div className="admin-record-card__header">
              <div>
                <h3>{client.fullName}</h3>
                <p>{client.cedula} · {client.email}</p>
              </div>
            </div>
            <form className="admin-form-grid" action={updateClientAction}>
              <input type="hidden" name="id" value={client.id} />
              <div className="field"><label>Nombre completo</label><input name="fullName" defaultValue={client.fullName} required /></div>
              <div className="field"><label>Cedula</label><input name="cedula" defaultValue={client.cedula} required /></div>
              <div className="field"><label>Correo</label><input name="email" type="email" defaultValue={client.email} required /></div>
              <div className="field"><label>Telefono</label><input name="phone" defaultValue={client.phone ?? ''} /></div>
              <div className="field"><label>Empresa</label><input name="company" defaultValue={client.company ?? ''} /></div>
              <div className="field"><label>Activo</label><input name="active" type="checkbox" defaultChecked={client.active} /></div>
              <div className="field--full"><button className="button button--outline button--small" type="submit">Actualizar</button></div>
            </form>
          </div>
        ))}
      </section>
    </>
  );
}
