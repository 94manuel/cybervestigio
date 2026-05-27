import Image from 'next/image';
import type { Invoice, SiteSettings } from '@/lib/types';
import {
  INVOICE_DOCUMENT_CODE,
  INVOICE_DOCUMENT_TITLE,
  INVOICE_DOCUMENT_VERSION,
  buildInvoiceDocumentData,
  moneyFormat,
} from '@/lib/invoice-document';

type DataRow = {
  label: string;
  value: string;
};

export function DocumentDataList({ items }: { items: DataRow[] }) {
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

export function InvoiceDocumentDossier({
  invoice,
  settings,
  className = 'invoice-dossier',
}: {
  invoice: Invoice;
  settings: SiteSettings;
  className?: string;
}) {
  const {
    issuerRows,
    clientRows,
    controlRows,
    billingRows,
    amountRows,
    timelineRows,
    documentRows,
    signatoryRows,
    purpose,
    agreementText,
    notesText,
    legalNotice,
  } = buildInvoiceDocumentData(invoice, settings);

  return (
    <section className={className}>
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
            <h2 className="invoice-dossier__title">{INVOICE_DOCUMENT_TITLE}</h2>
            <p className="invoice-dossier__intro">{purpose}</p>
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
              <span>Codigo</span>
              <strong>{INVOICE_DOCUMENT_CODE}</strong>
            </div>
            <div>
              <span>Version</span>
              <strong>{INVOICE_DOCUMENT_VERSION}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="invoice-dossier__band">
        {documentRows.map((row) => (
          <div className="invoice-dossier__band-item" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
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
            <strong>Convenio:</strong> {agreementText}
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
            <strong>Notas internas:</strong> {notesText}
          </div>
        </article>
      </div>

      <section className="invoice-dossier__signatures">
        {signatoryRows.map((row) => (
          <article className="invoice-signature-card" key={row.role}>
            <span>{row.role}</span>
            <strong>{row.signer}</strong>
            <p>{row.note}</p>
            <div className="invoice-signature-card__line" />
          </article>
        ))}
      </section>

      <div className="invoice-dossier__footer">
        <span>Uso interno restringido</span>
        <span>Documento {INVOICE_DOCUMENT_CODE} v{INVOICE_DOCUMENT_VERSION}</span>
        <span>{settings.companyName}</span>
      </div>

      <p className="invoice-dossier__legal-note">{legalNotice}</p>
    </section>
  );
}