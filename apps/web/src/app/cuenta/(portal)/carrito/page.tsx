import type { Metadata } from 'next';
import { getPortalCart } from '@/lib/api';
import { requireClientToken } from '@/lib/session';
import { checkoutCartAction, removeCartItemAction, updateCartItemAction } from '../actions';

export const metadata: Metadata = { title: 'Carrito de servicios' };

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function ClientCartPage() {
  const token = await requireClientToken();
  const cart = await getPortalCart(token);

  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Carrito y pago</h1>
          <p>Confirme su carrito y seleccione el método de pago para generar la orden.</p>
        </div>
      </header>

      <section className="admin-card">
        <h2>Servicios en carrito</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Cantidad</th>
                <th>Subtotal</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cart.items.length === 0 && (
                <tr>
                  <td colSpan={4}>No hay servicios en el carrito.</td>
                </tr>
              )}
              {cart.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.description}
                  </td>
                  <td>
                    <form className="inline-form" action={updateCartItemAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="number" name="quantity" defaultValue={item.quantity} min={1} style={{ width: 90 }} />
                      <button className="button button--outline button--small" type="submit">Actualizar</button>
                    </form>
                  </td>
                  <td>{money(item.lineTotal, cart.currency)}</td>
                  <td>
                    <form action={removeCartItemAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button className="button button--outline button--small danger" type="submit">Quitar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Checkout</h2>
        <p><strong>Total:</strong> {money(cart.total, cart.currency)}</p>
        <form className="admin-form-grid" action={checkoutCartAction}>
          <div className="field">
            <label htmlFor="paymentMethod">Método de pago</label>
            <select id="paymentMethod" name="paymentMethod" defaultValue="NEQUI" required>
              <option value="NEQUI">Nequi</option>
              <option value="DAVIPLATA">Daviplata</option>
              <option value="PSE">PSE</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="EFECTIVO">Efectivo</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="paymentNotes">Nota de pago (opcional)</label>
            <input id="paymentNotes" name="paymentNotes" placeholder="Ej. pago desde Nequi" />
          </div>
          <div className="field--full">
            <button className="button button--primary" type="submit" disabled={cart.items.length === 0}>Generar orden de pago</button>
          </div>
        </form>
      </section>
    </>
  );
}
