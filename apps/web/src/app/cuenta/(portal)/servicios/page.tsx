import type { Metadata } from 'next';
import Link from 'next/link';
import { getPortalCart, getPortalServices } from '@/lib/api';
import { requireClientToken } from '@/lib/session';
import { addServiceToCartAction } from '../actions';

export const metadata: Metadata = { title: 'Servicios del cliente' };

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function ClientServicesPage() {
  const token = await requireClientToken();
  const [services, cart] = await Promise.all([getPortalServices(token), getPortalCart(token)]);

  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Solicitar servicios</h1>
          <p>Agregue servicios al carrito para continuar con el pago por Nequi, PSE u otros medios.</p>
        </div>
        <Link href="/cuenta/carrito" className="button button--primary">Ver carrito ({cart.items.length})</Link>
      </header>

      <section className="admin-card">
        <div className="full-services-grid">
          {services.map((service) => (
            <article className="service-card" key={service.id}>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <p><strong>Referencia:</strong> {money(service.estimatedPrice, service.currency)}</p>
              <form className="inline-form" action={addServiceToCartAction}>
                <input type="hidden" name="serviceId" value={service.id} />
                <input type="number" name="quantity" defaultValue={1} min={1} max={20} style={{ width: 90 }} />
                <button className="button button--outline button--small" type="submit">Agregar</button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
