import type { Metadata } from 'next';
import Link from 'next/link';
import { getAdminBillingServices, getAdminClients, getAdminInvoices } from '@/lib/api';
import { ClientPicker } from '@/components/admin/ClientPicker';
import { InvoiceCatalogBuilder } from '@/components/admin/InvoiceCatalogBuilder';
import { InvoiceTotalsPreview } from '@/components/admin/InvoiceTotalsPreview';
import { requireAdminToken } from '@/lib/session';
import type { InvoiceStatus } from '@/lib/types';
import { createInvoiceAction } from './actions';

export const metadata: Metadata = { title: 'Facturas' };

const statusLabel: Record<InvoiceStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
};

function dateFormat(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function moneyFormat(value: number | string, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function parseStartDate(value?: string): number | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
}

function parseEndDate(value?: string): number | null {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59.999`);
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
}

export default async function InvoicesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; desde?: string; hasta?: string }>;
}) {
  const token = await requireAdminToken();
  const { cliente, desde, hasta } = await searchParams;
  const [invoices, clients, billingServices] = await Promise.all([
    getAdminInvoices(token),
    getAdminClients(token),
    getAdminBillingServices(token),
  ]);

  const customerFilter = (cliente ?? '').trim().toLowerCase();
  const fromDate = parseStartDate(desde);
  const toDate = parseEndDate(hasta);
  const hasFilters = Boolean(customerFilter || fromDate || toDate);

  const filteredInvoices = invoices
    .filter((invoice) => {
      if (customerFilter) {
        const haystack = `${invoice.customerName} ${invoice.customerEmail} ${invoice.company ?? ''}`.toLowerCase();
        if (!haystack.includes(customerFilter)) return false;
      }

      const createdAt = new Date(invoice.createdAt).getTime();
      if (fromDate !== null && createdAt < fromDate) return false;
      if (toDate !== null && createdAt > toDate) return false;
      return true;
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Facturas</h1>
          <p>Cree facturas, envielas por correo con enlace de pago y exporte todo el historial en Excel.</p>
        </div>
        <Link className="button button--primary button--small" href="/admin/facturas/export">
          Exportar Excel
        </Link>
      </header>

      <section className="admin-card">
        <h2>Nueva factura</h2>
        <form className="admin-form-grid" action={createInvoiceAction}>
          <div className="field"><label htmlFor="invoiceNumber">Consecutivo</label><input id="invoiceNumber" name="invoiceNumber" placeholder="FAC-2026-0001" required /></div>
          <div className="field field--full">
            <ClientPicker clients={clients} fieldName="customerClientId" label="Cliente registrado (buscar por nombre o cedula)" />
          </div>
          <div className="field"><label htmlFor="customerName">Cliente</label><input id="customerName" name="customerName" required /></div>
          <div className="field"><label htmlFor="customerEmail">Correo</label><input id="customerEmail" name="customerEmail" type="email" required /></div>
          <div className="field"><label htmlFor="customerPhone">Telefono</label><input id="customerPhone" name="customerPhone" /></div>
          <div className="field"><label htmlFor="company">Empresa</label><input id="company" name="company" /></div>
          <div className="field"><label htmlFor="currency">Moneda</label><input id="currency" name="currency" defaultValue="COP" required /></div>
          <div className="field"><label htmlFor="dueDate">Vencimiento</label><input id="dueDate" name="dueDate" type="datetime-local" required /></div>
          <div className="field field--full"><label htmlFor="description">Descripcion</label><textarea id="description" name="description" minLength={10} required /></div>
          <div className="field field--full">
            <label>Servicios cobrados sectorizados</label>
            <InvoiceCatalogBuilder fieldName="serviceItems" catalog={billingServices.filter((item) => item.active)} />
            <small className="admin-muted">Seleccione los servicios por sector y actualice el precio cuando aplique.</small>
          </div>
          <div className="field field--full">
            <label htmlFor="otherItems">Otros cobros (opcional)</label>
            <textarea id="otherItems" name="otherItems" placeholder="Gastos notariales|180000|1" />
            <small className="admin-muted">Si agrega otros, indique cual es y su precio.</small>
          </div>
          <div className="field field--full"><small className="admin-muted">El link de pago se genera automaticamente al crear la factura.</small></div>
          <div className="field"><label htmlFor="agreementDiscountApplied">Descuento por convenio</label><input id="agreementDiscountApplied" name="agreementDiscountApplied" type="checkbox" /></div>
          <div className="field"><label htmlFor="agreementDiscountAmount">Valor descuento convenio</label><input id="agreementDiscountAmount" name="agreementDiscountAmount" type="number" min="0" step="0.01" defaultValue={0} /></div>
          <div className="field field--full"><label htmlFor="agreementEntity">Entidad del convenio</label><input id="agreementEntity" name="agreementEntity" placeholder="Ej: Convenio Camara de Comercio" /></div>
          <div className="field field--full"><InvoiceTotalsPreview currency="COP" /></div>
          <div className="field"><label htmlFor="status">Estado inicial</label><select id="status" name="status" defaultValue="DRAFT"><option value="DRAFT">Borrador</option><option value="SENT">Enviada</option><option value="PAID">Pagada</option><option value="OVERDUE">Vencida</option><option value="CANCELLED">Cancelada</option></select></div>
          <div className="field field--full"><label htmlFor="notes">Notas</label><textarea id="notes" name="notes" /></div>
          <div className="field--full"><button className="button button--primary" type="submit">Crear factura</button></div>
        </form>
      </section>

      <section className="admin-card">
        <h2>Historial</h2>
        <form className="admin-form-grid" method="GET">
          <div className="field"><label htmlFor="cliente">Cliente</label><input id="cliente" name="cliente" defaultValue={cliente ?? ''} placeholder="Nombre, correo o empresa" /></div>
          <div className="field"><label htmlFor="desde">Fecha desde</label><input id="desde" name="desde" type="date" defaultValue={desde ?? ''} /></div>
          <div className="field"><label htmlFor="hasta">Fecha hasta</label><input id="hasta" name="hasta" type="date" defaultValue={hasta ?? ''} /></div>
          <div className="field field--full admin-inline-actions">
            <button className="button button--outline button--small" type="submit">Aplicar filtros</button>
            <Link className="link-arrow" href="/admin/facturas">Limpiar filtros</Link>
          </div>
        </form>

        <p className="admin-muted">Mostrando {filteredInvoices.length} factura(s){hasFilters ? ' filtrada(s).' : '.'}</p>

        {filteredInvoices.length === 0 && (
          <p>{hasFilters ? 'No hay facturas que coincidan con los filtros.' : 'No existen facturas registradas.'}</p>
        )}

        {filteredInvoices.length > 0 && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Consecutivo</th>
                  <th>Cliente</th>
                  <th>Fecha de creacion</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><strong>{invoice.invoiceNumber}</strong></td>
                    <td>
                      <strong>{invoice.customerName}</strong>
                      <span>{invoice.customerEmail}</span>
                    </td>
                    <td>{dateFormat(invoice.createdAt)}</td>
                    <td>{dateFormat(invoice.dueDate)}</td>
                    <td><span className={`tag tag--invoice-${invoice.status}`}>{statusLabel[invoice.status]}</span></td>
                    <td>{moneyFormat(invoice.amount, invoice.currency)}</td>
                    <td>
                      <Link className="link-arrow" href={`/admin/facturas/${invoice.id}`}>
                        Ver detalles
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
