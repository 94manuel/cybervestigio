import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getPublicInvoice } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pago de factura',
};

function moneyFormat(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function InvoicePayPage({
  params,
}: {
  params: Promise<{ invoiceNumber: string }>;
}) {
  const { invoiceNumber } = await params;

  let invoice;
  try {
    invoice = await getPublicInvoice(invoiceNumber);
  } catch {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main>
        <section className="services">
          <div className="container">
            <header className="section-head">
              <p className="eyebrow">Pago en linea</p>
              <h1 className="section-title">Pago factura {invoice.invoiceNumber}</h1>
              <p className="section-intro">Total a pagar: {moneyFormat(invoice.amount, invoice.currency)}</p>
            </header>

            <article className="admin-card">
              <p>
                Este enlace de pago fue generado automaticamente por el sistema para la factura <strong>{invoice.invoiceNumber}</strong>.
              </p>
              <p>
                Estado actual: <strong>{invoice.status}</strong>
              </p>
              <div className="hero-actions">
                <Link className="button button--outline" href={`/facturas/${encodeURIComponent(invoice.invoiceNumber)}`}>
                  Ver detalle de factura
                </Link>
              </div>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
