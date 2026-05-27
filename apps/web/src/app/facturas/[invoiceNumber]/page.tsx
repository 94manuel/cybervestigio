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

export default async function PublicInvoicePage({
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
              <p className="eyebrow">Factura en linea</p>
              <h1 className="section-title">Factura {invoice.invoiceNumber}</h1>
              <p className="section-intro">Cliente: {invoice.customerName}</p>
            </header>

            <article className="admin-card">
              <h2>Detalle de cobro</h2>
              <p>{invoice.description}</p>
              <ul>
                {invoice.lineItems.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    {item.title} · Cantidad: {item.quantity} · Valor: {moneyFormat(item.lineTotal, invoice.currency)}
                  </li>
                ))}
              </ul>
              <p>
                <strong>Total:</strong> {moneyFormat(invoice.amount, invoice.currency)}
              </p>
              <p>
                <strong>Fecha limite:</strong>{' '}
                {new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(invoice.dueDate))}
              </p>
              <p>
                <strong>Estado:</strong> {invoice.status}
              </p>
              <div className="hero-actions">
                <Link className="button button--primary" href={invoice.paymentUrl} target="_blank">
                  Pagar ahora
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
