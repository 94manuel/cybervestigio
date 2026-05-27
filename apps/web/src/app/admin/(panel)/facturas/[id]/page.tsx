import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminBillingServices, getAdminClients, getAdminInvoice, getAdminSettings, getAdminUsers } from '@/lib/api';
import { DocumentDataList, InvoiceDocumentDossier } from '@/components/admin/InvoiceDocumentDossier';
import { ClientPicker } from '@/components/admin/ClientPicker';
import { InvoiceCatalogBuilder } from '@/components/admin/InvoiceCatalogBuilder';
import { InvoiceTotalsPreview } from '@/components/admin/InvoiceTotalsPreview';
import { dateFormat, moneyFormat, statusLabel } from '@/lib/invoice-document';
import { requireAdminToken } from '@/lib/session';
import type { BillingService, InvoiceLineItem } from '@/lib/types';
import { sendInvoiceAction, updateInvoiceAction } from '../actions';

export const metadata: Metadata = { title: 'Detalle de factura' };

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

export default async function InvoiceAdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await requireAdminToken();
  const { id } = await params;

  const [invoice, users, clients, billingServices, settings] = await Promise.all([
    getAdminInvoice(token, id),
    getAdminUsers(token),
    getAdminClients(token),
    getAdminBillingServices(token),
    getAdminSettings(token),
  ]);

  if (!invoice) notFound();

  const pdfHref = `/admin/facturas/${invoice.id}/pdf`;
  const documentHref = `/admin/facturas/${invoice.id}/documento`;

  return (
    <>
      <header className="admin-heading invoice-detail-heading">
        <div>
          <p className="invoice-detail-heading__eyebrow">Control documental de facturacion</p>
          <h1>Factura {invoice.invoiceNumber}</h1>
          <p>Expediente de cobro con presentacion institucional, trazabilidad y soporte formal para revision interna o remision.</p>
        </div>
        <div className="invoice-detail-heading__actions">
          <span className={`tag tag--invoice-${invoice.status}`}>{statusLabel[invoice.status]}</span>
          <Link className="button button--outline button--small" href="/admin/facturas">
            Volver al historial
          </Link>
          <Link className="button button--outline button--small" href={documentHref} target="_blank">
            Ver documento
          </Link>
          <Link className="button button--primary button--small" href={pdfHref} target="_blank">
            Descargar PDF
          </Link>
        </div>
      </header>

      <InvoiceDocumentDossier invoice={invoice} settings={settings} />

      <div className="invoice-admin-layout">
        <section className="admin-card invoice-form-card">
          <div className="invoice-form-card__header">
            <div>
              <h2>Actualizar registro</h2>
              <p>Edite el documento sin perder la presentacion formal del resumen superior.</p>
            </div>
            <span className="invoice-form-card__hint">Edicion operativa</span>
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
              <span className="admin-muted">La ficha superior y el PDF se actualizan con la informacion guardada.</span>
            </div>
          </form>
        </section>

        <aside className="invoice-side-stack">
          <section className="admin-card invoice-actions-card">
            <h2>Acciones rapidas</h2>
            <div className="invoice-actions-card__buttons">
              <Link className="button button--outline button--small" href={documentHref} target="_blank">
                Abrir vista documento
              </Link>
              <Link className="button button--primary button--small" href={pdfHref} target="_blank">
                Descargar PDF
              </Link>
              <Link className="button button--outline button--small" href={invoice.paymentUrl} target="_blank">
                Abrir link de pago
              </Link>
            </div>
            <DocumentDataList
              items={[
                { label: 'Factura', value: invoice.invoiceNumber },
                { label: 'Estado', value: statusLabel[invoice.status] },
                { label: 'Total', value: moneyFormat(invoice.amount, invoice.currency) },
                { label: 'Vence', value: dateFormat(invoice.dueDate) },
              ]}
            />
          </section>

          <section className="admin-card invoice-send-card">
            <div className="invoice-form-card__header">
              <div>
                <h2>Envio de factura</h2>
                <p>Remita el documento al usuario o cliente destinatario desde esta misma vista.</p>
              </div>
            </div>

            <form className="admin-form-grid" action={sendInvoiceAction}>
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
              <div className="field--full admin-inline-actions">
                <button className="button button--primary button--small" type="submit">Enviar factura</button>
              </div>
            </form>
          </section>

          <section className="admin-card invoice-note-card">
            <h2>Reserva documental</h2>
            <p className="admin-muted">
              Este resumen usa un lenguaje mas formal y documental para alinearse con el paquete de formatos forenses.
              La descarga PDF conserva esa misma linea visual para remision o archivo interno.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}