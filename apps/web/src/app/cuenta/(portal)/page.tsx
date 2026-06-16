import type { Metadata } from 'next';
import { getPortalOrders, getPortalProfile } from '@/lib/api';
import { requireClientToken } from '@/lib/session';
import { reportOrderPaymentAction } from './actions';

export const metadata: Metadata = { title: 'Portal del cliente' };

type Props = { searchParams: Promise<{ checkout?: string; paid?: string; error?: string }> };

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function ClientPortalHomePage({ searchParams }: Props) {
  const params = await searchParams;
  const token = await requireClientToken();
  const [profile, orders] = await Promise.all([getPortalProfile(token), getPortalOrders(token)]);

  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Bienvenido, {profile.user.fullName}</h1>
          <p>Desde aquí puede revisar sus órdenes, reportar pagos y acceder a su drive de expedientes.</p>
        </div>
      </header>

      {params.checkout && <p className="form-message">Orden creada. Ahora reporte el pago para abrir su expediente.</p>}
      {params.paid && <p className="form-message">Pago confirmado y expediente generado correctamente.</p>}
      {params.error && <p className="form-message form-message--error">No fue posible completar la operación.</p>}

      <section className="metrics-grid">
        <article className="metric-card"><span>Órdenes</span><strong>{profile.metrics.orders}</strong></article>
        <article className="metric-card"><span>Expedientes</span><strong>{profile.metrics.expedientes}</strong></article>
        <article className="metric-card"><span>Recibos pendientes</span><strong>{profile.metrics.pendingReceipts}</strong></article>
        <article className="metric-card"><span>Estado cuenta</span><strong>{profile.user.status}</strong></article>
      </section>

      <section className="admin-card">
        <h2>Órdenes recientes</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Pago</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4}>Aún no tiene órdenes registradas.</td>
                </tr>
              )}
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.orderNumber}</strong>
                    {order.items.map((item) => item.serviceTitle).join(', ')}
                  </td>
                  <td>{money(order.total, order.currency)}</td>
                  <td>
                    <span className="tag">{order.status}</span>
                  </td>
                  <td>
                    {order.status === 'PAID' ? (
                      <span className="tag tag--invoice-PAID">Pago confirmado</span>
                    ) : (
                      <form className="admin-form-grid" action={reportOrderPaymentAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <div className="field">
                          <label>Referencia</label>
                          <input name="paymentReference" required placeholder="TRX-NEQUI-..." />
                        </div>
                        <div className="field">
                          <label>Nota (opcional)</label>
                          <input name="paymentNotes" placeholder="Pago desde app" />
                        </div>
                        <div className="field--full">
                          <button className="button button--outline button--small" type="submit">Reportar pago</button>
                        </div>
                      </form>
                    )}
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
