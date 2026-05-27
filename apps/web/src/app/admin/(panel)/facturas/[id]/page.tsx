import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminBillingServices, getAdminClients, getAdminInvoice, getAdminSettings, getAdminUsers } from '@/lib/api';
import { ClientPicker } from '@/components/admin/ClientPicker';
import { InvoiceCatalogBuilder } from '@/components/admin/InvoiceCatalogBuilder';
import { InvoiceTotalsPreview } from '@/components/admin/InvoiceTotalsPreview';
import { requireAdminToken } from '@/lib/session';
import type { BillingService, InvoiceLineItem, InvoiceStatus } from '@/lib/types';
import { sendInvoiceAction, updateInvoiceAction } from '../actions';

export const metadata: Metadata = { title: 'Detalle de factura' };

const statusLabel: Record<InvoiceStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
};

type DataRow = {
  label: string;
  value: string;
};

type TimelineRow = {
  title: string;
  value: string;
  detail: string;
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

function DocumentDataList({ items }: { items: DataRow[] }) {
  return (
    <dl className="invoice-data-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
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

  const issuerRows: DataRow[] = [
    { label: 'Entidad emisora', value: settings.companyName },
    { label: 'Correo institucional', value: settings.contactEmail },
    { label: 'Telefono', value: settings.contactPhone?.trim() || 'No registrado' },
    { label: 'Ubicacion', value: settings.location },
  ];

  const clientRows: DataRow[] = [
    { label: 'Cliente', value: invoice.customerName },
    { label: 'Correo', value: invoice.customerEmail },
    { label: 'Telefono', value: invoice.customerPhone?.trim() || 'No registrado' },
    { label: 'Empresa', value: invoice.company?.trim() || 'No registrada' },
  ];

  const controlRows: DataRow[] = [
    { label: 'Proceso', value: 'Gestion de evidencia digital y facturacion' },
    { label: 'Estado documental', value: 'Vigente' },
    { label: 'Clasificacion', value: 'Confidencial' },
    { label: 'Copia', value: 'Controlada' },
  ];

  const billingRows: DataRow[] = [
    { label: 'Consecutivo', value: invoice.invoiceNumber },
    { label: 'Estado de cobro', value: statusLabel[invoice.status] },
    { label: 'Fecha de emision', value: dateFormat(invoice.createdAt) },
    { label: 'Fecha de vencimiento', value: dateFormat(invoice.dueDate) },
  ];

  const amountRows: DataRow[] = [
    { label: 'Subtotal', value: moneyFormat(invoice.subtotal, invoice.currency) },
    { label: 'Descuento convenio', value: moneyFormat(invoice.agreementDiscountAmount, invoice.currency) },
    { label: 'Total final', value: moneyFormat(invoice.amount, invoice.currency) },
    { label: 'Moneda', value: invoice.currency },
  ];

  const timelineRows: TimelineRow[] = [
    {
      title: 'Registro de factura',
      value: dateFormat(invoice.createdAt),
      detail: 'Creacion inicial del documento de cobro dentro del panel administrativo.',
    },
    {
      title: invoice.sentAt ? 'Envio registrado' : 'Envio pendiente',
      value: invoice.sentAt ? dateFormat(invoice.sentAt) : 'Sin envio registrado',
      detail: invoice.sentAt
        ? 'La factura fue remitida al destinatario con enlace de pago.'
        : 'Todavia no se registra envio al destinatario desde el panel.',
    },
    {
      title: invoice.paidAt ? 'Pago confirmado' : 'Pago no confirmado',
      value: invoice.paidAt ? dateFormat(invoice.paidAt) : 'Sin confirmacion de pago',
      detail: invoice.paidAt
        ? 'Existe marca de pago en el historial del documento.'
        : 'La trazabilidad aun no reporta cierre por pago.',
    },
  ];

  const pdfHref = `/admin/facturas/${invoice.id}/pdf`;

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
          <Link className="button button--primary button--small" href={pdfHref} target="_blank">
            Descargar PDF
          </Link>
        </div>
      </header>

      <section className="invoice-dossier">
        <div className="invoice-dossier__hero">
          <div className="invoice-dossier__brand">
            <Image
              src="/brand/cybervestigio-logo-cropped.png"
              alt="CyberVestigio"
              width={220}
              height={78}
              className="invoice-dossier__logo"
              priority
            />
            <div className="invoice-dossier__brand-copy">
              <p className="invoice-dossier__eyebrow">Control documental y aprobacion</p>
              <h2 className="invoice-dossier__title">Acta ejecutiva de facturacion y relacion de cobro</h2>
              <p className="invoice-dossier__intro">
                La composicion de esta vista toma como referencia el tono y la estructura de los formatos institucionales
                enviados: encabezado sobrio, bloques de control, informacion tabular y trazabilidad clara.
              </p>
            </div>
          </div>

          <aside className="invoice-dossier__control">
            <p className="invoice-dossier__control-title">Ficha documental</p>
            <div className="invoice-dossier__control-grid">
              <div>
                <span>Proceso</span>
                <strong>Servicios periciales y facturacion</strong>
              </div>
              <div>
                <span>Clasificacion</span>
                <strong>Confidencial</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>{statusLabel[invoice.status]}</strong>
              </div>
              <div>
                <span>Generado</span>
                <strong>{dateFormat(invoice.createdAt)}</strong>
              </div>
            </div>
          </aside>
        </div>

        <div className="invoice-dossier__meta-grid">
          <article className="invoice-sheet">
            <p className="invoice-sheet__eyebrow">Emisor</p>
            <h3 className="invoice-sheet__title">Entidad responsable</h3>
            <DocumentDataList items={issuerRows} />
          </article>

          <article className="invoice-sheet">
            <p className="invoice-sheet__eyebrow">Cliente</p>
            <h3 className="invoice-sheet__title">Destinatario del cobro</h3>
            <DocumentDataList items={clientRows} />
          </article>

          <article className="invoice-sheet">
            <p className="invoice-sheet__eyebrow">Control</p>
            <h3 className="invoice-sheet__title">Parametros documentales</h3>
            <DocumentDataList items={controlRows} />
          </article>

          <article className="invoice-sheet">
            <p className="invoice-sheet__eyebrow">Factura</p>
            <h3 className="invoice-sheet__title">Datos del documento</h3>
            <DocumentDataList items={billingRows} />
          </article>
        </div>

        <div className="invoice-dossier__columns">
          <article className="invoice-sheet invoice-sheet--wide">
            <div className="invoice-sheet__header">
              <div>
                <p className="invoice-sheet__eyebrow">Relacion de cobro</p>
                <h3 className="invoice-sheet__title">Conceptos facturados</h3>
              </div>
              <div className="invoice-sheet__badge">{invoice.lineItems.length} concepto(s)</div>
            </div>

            <div className="table-wrap">
              <table className="invoice-document-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Concepto</th>
                    <th>Cantidad</th>
                    <th>Vr. unitario</th>
                    <th>Vr. total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item, index) => (
                    <tr key={`${item.title}-${index}`}>
                      <td>{String(index + 1).padStart(2, '0')}</td>
                      <td>
                        <strong>{item.title}</strong>
                        <span>{item.serviceId ? 'Servicio catalogado del expediente' : 'Concepto adicional registrado manualmente'}</span>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{moneyFormat(item.unitPrice, invoice.currency)}</td>
                      <td>{moneyFormat(item.lineTotal, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="invoice-sheet">
            <p className="invoice-sheet__eyebrow">Resumen economico</p>
            <h3 className="invoice-sheet__title">Valores consolidados</h3>
            <DocumentDataList items={amountRows} />

            <div className="invoice-sheet__notice">
              <strong>Convenio:</strong>{' '}
              {invoice.agreementDiscountApplied
                ? invoice.agreementEntity?.trim() || 'Descuento aplicado sin entidad especificada'
                : 'No se aplico descuento por convenio.'}
            </div>
          </article>
        </div>

        <div className="invoice-dossier__columns invoice-dossier__columns--secondary">
          <article className="invoice-sheet">
            <p className="invoice-sheet__eyebrow">Alcance</p>
            <h3 className="invoice-sheet__title">Descripcion del servicio</h3>
            <p className="invoice-rich-copy">{invoice.description}</p>

            <div className="invoice-sheet__notice">
              <strong>Portal de pago:</strong> El enlace de pago se administra desde el canal seguro del portal y puede abrirse desde las acciones rapidas del expediente.
            </div>
          </article>

          <article className="invoice-sheet">
            <p className="invoice-sheet__eyebrow">Trazabilidad</p>
            <h3 className="invoice-sheet__title">Registro cronologico</h3>
            <ol className="invoice-timeline">
              {timelineRows.map((item) => (
                <li key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.value}</span>
                  </div>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ol>

            <div className="invoice-sheet__notice invoice-sheet__notice--muted">
              <strong>Notas internas:</strong> {invoice.notes?.trim() || 'Sin notas adicionales registradas en el expediente.'}
            </div>
          </article>
        </div>

        <div className="invoice-dossier__footer">
          <span>Uso interno restringido</span>
          <span>Documento generado para el expediente {invoice.invoiceNumber}</span>
          <span>{settings.companyName}</span>
        </div>
      </section>

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