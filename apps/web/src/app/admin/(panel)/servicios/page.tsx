import type { Metadata } from 'next';
import { getAdminServices } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';
import { createServiceAction, deleteServiceAction, updateServiceAction } from './actions';

export const metadata: Metadata = { title: 'Administrar servicios' };

export default async function ServicesAdminPage() {
  const token = await requireAdminToken();
  const services = await getAdminServices(token);
  return (
    <>
      <header className="admin-heading"><div><h1>Servicios publicados</h1><p>Controle el contenido que se presenta en el inicio y en la sección de servicios.</p></div></header>
      <section className="admin-card">
        <h2>Crear nuevo servicio</h2>
        <form className="admin-form-grid" action={createServiceAction}>
          <div className="field"><label htmlFor="new-title">Título</label><input id="new-title" name="title" required /></div>
          <div className="field"><label htmlFor="new-slug">Slug</label><input id="new-slug" name="slug" placeholder="analisis-forense" required /></div>
          <div className="field field--full"><label htmlFor="new-description">Descripción</label><textarea id="new-description" name="description" minLength={15} required /></div>
          <div className="field"><label htmlFor="new-icon">Icono</label><select id="new-icon" name="icon"><option value="search">Búsqueda</option><option value="hard-drive">Disco</option><option value="file-check">Documento</option><option value="smartphone">Móvil</option></select></div>
          <div className="field"><label htmlFor="new-order">Orden</label><input id="new-order" name="sortOrder" type="number" defaultValue="5" required /></div>
          <label className="checkbox field--full"><input name="active" type="checkbox" defaultChecked /> Publicar servicio en el sitio</label>
          <div className="field--full"><button type="submit" className="button button--primary">Crear servicio</button></div>
        </form>
      </section>
      <section className="admin-card">
        <h2>Editar servicios existentes</h2>
        {services.map((service) => (
          <div className="admin-service-card" key={service.id}>
            <form className="admin-form-grid" action={updateServiceAction}>
              <input type="hidden" name="id" value={service.id} />
              <div className="field"><label>Título</label><input name="title" defaultValue={service.title} required /></div>
              <div className="field"><label>Slug</label><input name="slug" defaultValue={service.slug} required /></div>
              <div className="field field--full"><label>Descripción</label><textarea name="description" defaultValue={service.description} required /></div>
              <div className="field"><label>Icono</label><select name="icon" defaultValue={service.icon}><option value="search">Búsqueda</option><option value="hard-drive">Disco</option><option value="file-check">Documento</option><option value="smartphone">Móvil</option></select></div>
              <div className="field"><label>Orden</label><input name="sortOrder" type="number" defaultValue={service.sortOrder} required /></div>
              <label className="checkbox field--full"><input name="active" type="checkbox" defaultChecked={service.active} /> Servicio activo</label>
              <div className="field--full"><button className="button button--outline button--small" type="submit">Guardar cambios</button></div>
            </form>
            <form className="actions-column" action={deleteServiceAction}>
              <input type="hidden" name="id" value={service.id} />
              <button className="button button--small danger" type="submit">Eliminar</button>
            </form>
          </div>
        ))}
      </section>
    </>
  );
}
