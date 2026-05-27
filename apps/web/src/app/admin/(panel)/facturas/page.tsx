import type { Metadata } from 'next';
import Link from 'next/link';
import { getAdminBillingServices, getAdminClients, getAdminInvoices, getAdminUsers } from '@/lib/api';
import { ClientPicker } from '@/components/admin/ClientPicker';
import { InvoiceCatalogBuilder } from '@/components/admin/InvoiceCatalogBuilder';
import { InvoiceTotalsPreview } from '@/components/admin/InvoiceTotalsPreview';
import { requireAdminToken } from '@/lib/session';
import type { BillingService, InvoiceLineItem, InvoiceStatus } from '@/lib/types';
import { createInvoiceAction, sendInvoiceAction, updateInvoiceAction } from './actions';

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

function toCatalogItems(items: InvoiceLineItem[], catalog: BillingService[]): InvoiceLineItem[] {
  const ids = new Set(catalog.map((item) => item.id));
  const names = new Set(catalog.map((item) => item.service));
  return items.filter((item) => (item.serviceId ? ids.has(item.serviceId) : names.has(item.title)));
}

function toOtherItemsText(items: InvoiceLineItem[], catalog: BillingService[]): string {
  const ids = new Set(catalog.map((item) => item.id));
  const names = new Set(catalog.map((item) => item.service));
  return items
    .filter((item) => (item.serviceId ? !ids.has(item.serviceId) : !names.has(item.title)))
    .map((item) => `${item.title}|${item.unitPrice}|${item.quantity}`)
    .join('\n');
}

export default async function InvoicesAdminPage() {
  const token = await requireAdminToken();
  const [invoices, users, clients, billingServices] = await Promise.all([
    getAdminInvoices(token),
    getAdminUsers(token),
    getAdminClients(token),
    getAdminBillingServices(token),
  ]);

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
        {invoices.length === 0 && <p>No existen facturas registradas.</p>}
        {invoices.map((invoice) => (
          <div className="admin-record-card" key={invoice.id}>
            <div className="admin-record-card__header">
              <div>
                <h3>{invoice.invoiceNumber}</h3>
                <p>{invoice.customerName} · {invoice.customerEmail}</p>
              </div>
              <div className="admin-record-card__meta">
                <span className={`tag tag--invoice-${invoice.status}`}>{statusLabel[invoice.status]}</span>
                <strong>{moneyFormat(invoice.amount, invoice.currency)}</strong>
              </div>
            </div>

            <form className="admin-form-grid" action={updateInvoiceAction}>
              <input type="hidden" name="id" value={invoice.id} />
              <div className="field field--full">
                <ClientPicker
                  clients={clients}
                  fieldName="customerClientId"
                  label="Cliente registrado (buscar por nombre o cedula)"
                  defaultClientId={invoice.customerClientId ?? undefined}
                />
              </div>
              <div className="field"><label>Consecutivo</label><input name="invoiceNumber" defaultValue={invoice.invoiceNumber} required /></div>
              <div className="field"><label>Cliente</label><input name="customerName" defaultValue={invoice.customerName} required /></div>
              <div className="field"><label>Correo</label><input name="customerEmail" type="email" defaultValue={invoice.customerEmail} required /></div>
              <div className="field"><label>Telefono</label><input name="customerPhone" defaultValue={invoice.customerPhone ?? ''} /></div>
              <div className="field"><label>Empresa</label><input name="company" defaultValue={invoice.company ?? ''} /></div>
              <div className="field"><label>Moneda</label><input name="currency" defaultValue={invoice.currency} required /></div>
              <div className="field"><label>Vencimiento</label><input name="dueDate" type="datetime-local" defaultValue={new Date(invoice.dueDate).toISOString().slice(0, 16)} required /></div>
              <div className="field field--full"><label>Descripcion</label><textarea name="description" defaultValue={invoice.description} required /></div>
              <div className="field field--full">
                <label>Servicios cobrados sectorizados</label>
                <InvoiceCatalogBuilder
                  fieldName="serviceItems"
                  catalog={billingServices.filter((item) => item.active)}
                  initialItems={toCatalogItems(invoice.lineItems, billingServices)}
                />
                <small className="admin-muted">Puede ajustar precios y cantidades por servicio.</small>
              </div>
              <div className="field field--full">
                <label>Otros cobros</label>
                <textarea name="otherItems" defaultValue={toOtherItemsText(invoice.lineItems, billingServices)} placeholder="Informe adicional|250000|1" />
              </div>
              <div className="field field--full"><small className="admin-muted">Link de pago auto-generado: {invoice.paymentUrl}</small></div>
              <div className="field"><label>Subtotal</label><input value={moneyFormat(invoice.subtotal, invoice.currency)} readOnly /></div>
              <div className="field"><label>Descuento convenio</label><input name="agreementDiscountAmount" type="number" min="0" step="0.01" defaultValue={Number(invoice.agreementDiscountAmount)} /></div>
              <div className="field"><label>Aplicar convenio</label><input name="agreementDiscountApplied" type="checkbox" defaultChecked={invoice.agreementDiscountApplied} /></div>
              <div className="field"><label>Entidad convenio</label><input name="agreementEntity" defaultValue={invoice.agreementEntity ?? ''} /></div>
              <div className="field field--full"><InvoiceTotalsPreview currency={invoice.currency || 'COP'} /></div>
              <div className="field"><label>Estado</label><select name="status" defaultValue={invoice.status}><option value="DRAFT">Borrador</option><option value="SENT">Enviada</option><option value="PAID">Pagada</option><option value="OVERDUE">Vencida</option><option value="CANCELLED">Cancelada</option></select></div>
              <div className="field field--full"><label>Notas</label><textarea name="notes" defaultValue={invoice.notes ?? ''} /></div>
              <div className="field--full admin-inline-actions">
                <button className="button button--outline button--small" type="submit">Guardar cambios</button>
                <span className="admin-muted">Creada: {dateFormat(invoice.createdAt)}{invoice.sentAt ? ` · Enviada: ${dateFormat(invoice.sentAt)}` : ''}{invoice.paidAt ? ` · Pagada: ${dateFormat(invoice.paidAt)}` : ''}</span>
              </div>
            </form>

            <form className="admin-send-form" action={sendInvoiceAction}>
              <input type="hidden" name="id" value={invoice.id} />
              <div className="field">
                <label>Usuario registrado</label>
                <select name="recipientUserId" defaultValue="">
                  <option value="">Seleccionar usuario (opcional)</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name} - {user.email}</option>
                  ))}
                </select>
              </div>
              <div className="field field--full">
                <ClientPicker
                  clients={clients.filter((item) => item.active)}
                  fieldName="recipientClientId"
                  label="Cliente registrado destinatario (nombre o cedula)"
                  defaultClientId={invoice.customerClientId ?? undefined}
                />
              </div>
              <div className="field"><label>Enviar a</label><input name="to" type="email" defaultValue={invoice.customerEmail} /></div>
              <div className="field field--full"><label>Mensaje adicional</label><textarea name="message" placeholder="Adjuntamos su factura y el enlace de pago." /></div>
              <div className="admin-inline-actions">
                <button className="button button--primary button--small" type="submit">Enviar factura</button>
                <Link className="link-arrow" href={invoice.paymentUrl} target="_blank">Abrir link de pago</Link>
              </div>
            </form>
          </div>
        ))}
      </section>
    </>
  );
}
