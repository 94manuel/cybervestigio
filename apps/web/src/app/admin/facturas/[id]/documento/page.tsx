import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InvoiceDocumentDossier } from '@/components/admin/InvoiceDocumentDossier';
import { PrintDocumentButton } from '@/components/admin/PrintDocumentButton';
import { getAdminInvoice, getAdminSettings } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';

export const metadata: Metadata = { title: 'Documento de factura' };

export default async function InvoiceDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await requireAdminToken();
  const { id } = await params;
  const [invoice, settings] = await Promise.all([getAdminInvoice(token, id), getAdminSettings(token)]);

  if (!invoice) notFound();

  const detailHref = `/admin/facturas/${invoice.id}`;
  const pdfHref = `/admin/facturas/${invoice.id}/pdf`;

  return (
    <main className="invoice-document-shell">
      <header className="invoice-document-shell__toolbar no-print">
        <div>
          <p className="invoice-document-shell__eyebrow">Vista de solo lectura</p>
          <h1>Documento de factura {invoice.invoiceNumber}</h1>
          <p>Version limpia para revision, impresion o presentacion sin elementos operativos del panel.</p>
        </div>
        <div className="invoice-document-shell__actions">
          <Link className="button button--outline button--small" href={detailHref}>
            Volver al detalle
          </Link>
          <PrintDocumentButton />
          <Link className="button button--primary button--small" href={pdfHref} target="_blank">
            Descargar PDF
          </Link>
        </div>
      </header>

      <div className="invoice-document-shell__canvas">
        <InvoiceDocumentDossier invoice={invoice} settings={settings} className="invoice-dossier invoice-dossier--document" />
      </div>
    </main>
  );
}