import type { Metadata } from 'next';
import { getAdminBillingServices } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';
import { bootstrapBillingCatalogAction, createBillingServiceAction, updateBillingServiceAction } from './actions';

export const metadata: Metadata = { title: 'Servicios de cobro' };

function moneyFormat(value: number | string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default async function BillingServicesPage() {
  const token = await requireAdminToken();
  const services = await getAdminBillingServices(token);

  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Servicios de cobro</h1>
          <p>Configure todos los servicios facturables por sector y actualice precios cuando sea necesario.</p>
        </div>
        <form action={bootstrapBillingCatalogAction}>
          <button className="button button--outline button--small" type="submit">Cargar catalogo base</button>
        </form>
      </header>

      <section className="admin-card">
        <h2>Crear servicio de cobro</h2>
        <form className="admin-form-grid" action={createBillingServiceAction}>
          <div className="field"><label>Sector</label><input name="sector" required /></div>
          <div className="field"><label>Servicio</label><input name="service" required /></div>
          <div className="field field--full"><label>Alcance</label><textarea name="scope" required /></div>
          <div className="field"><label>Precio recomendado</label><input name="recommendedPrice" type="number" min="0" step="1" required /></div>
          <div className="field"><label>Nota de precio</label><input name="priceNote" placeholder="desde, por hora, etc." /></div>
          <div className="field"><label>Orden</label><input name="sortOrder" type="number" min="0" step="1" defaultValue={0} /></div>
          <div className="field"><label>Activo</label><input name="active" type="checkbox" defaultChecked /></div>
          <div className="field--full"><button className="button button--primary" type="submit">Guardar servicio</button></div>
        </form>
      </section>

      <section className="admin-card">
        <h2>Servicios configurados</h2>
        {services.length === 0 && <p>No hay servicios de cobro en BD.</p>}
        {services.map((service) => (
          <div className="admin-record-card" key={service.id}>
            <div className="admin-record-card__header">
              <div>
                <h3>{service.service}</h3>
                <p>{service.sector}</p>
              </div>
              <div className="admin-record-card__meta">
                <strong>{moneyFormat(service.recommendedPrice)}</strong>
                <span className="admin-muted">{service.active ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>
            <form className="admin-form-grid" action={updateBillingServiceAction}>
              <input type="hidden" name="id" value={service.id} />
              <div className="field"><label>Sector</label><input name="sector" defaultValue={service.sector} required /></div>
              <div className="field"><label>Servicio</label><input name="service" defaultValue={service.service} required /></div>
              <div className="field field--full"><label>Alcance</label><textarea name="scope" defaultValue={service.scope} required /></div>
              <div className="field"><label>Precio recomendado</label><input name="recommendedPrice" type="number" min="0" step="1" defaultValue={Number(service.recommendedPrice)} required /></div>
              <div className="field"><label>Nota de precio</label><input name="priceNote" defaultValue={service.priceNote ?? ''} /></div>
              <div className="field"><label>Orden</label><input name="sortOrder" type="number" min="0" step="1" defaultValue={service.sortOrder} /></div>
              <div className="field"><label>Activo</label><input name="active" type="checkbox" defaultChecked={service.active} /></div>
              <div className="field--full"><button className="button button--outline button--small" type="submit">Actualizar</button></div>
            </form>
          </div>
        ))}
      </section>
    </>
  );
}
