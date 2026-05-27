'use client';

import { useEffect, useRef, useState } from 'react';

type Totals = {
  subtotal: number;
  discount: number;
  total: number;
};

function parseMoney(value: string): number {
  const normalized = value.trim();
  if (!normalized) return 0;
  const plain = normalized.replace(/\s/g, '').replace(/\$/g, '');
  if (/^-?\d+(\.\d+)?$/.test(plain)) return Number(plain);

  const noThousands = plain.replace(/\./g, '').replace(',', '.');
  if (/^-?\d+(\.\d+)?$/.test(noThousands)) return Number(noThousands);

  const digitsOnly = plain.replace(/[^\d.-]/g, '');
  return Number(digitsOnly || 0);
}

function parseLineItems(raw: string): Array<{ unitPrice: number; quantity: number }> {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((value) => value.trim());
      const unitPrice = parseMoney(parts[1] ?? '0');
      const quantity = Number(parts[2] ?? '1') || 1;
      return { unitPrice, quantity };
    });
}

function moneyFormat(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function InvoiceTotalsPreview({ currency = 'COP' }: { currency?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [totals, setTotals] = useState<Totals>({ subtotal: 0, discount: 0, total: 0 });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const form = root.closest('form');
    if (!form) return;

    const recalc = () => {
      const serviceItems = (form.querySelector('[name="serviceItems"]') as HTMLTextAreaElement | null)?.value ?? '';
      const otherItems = (form.querySelector('[name="otherItems"]') as HTMLTextAreaElement | null)?.value ?? '';
      const discountApplied = Boolean((form.querySelector('[name="agreementDiscountApplied"]') as HTMLInputElement | null)?.checked);
      const discountAmountRaw = (form.querySelector('[name="agreementDiscountAmount"]') as HTMLInputElement | null)?.value ?? '0';

      const lineItems = [...parseLineItems(serviceItems), ...parseLineItems(otherItems)];
      const subtotal = Number(lineItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0).toFixed(2));
      const requestedDiscount = parseMoney(discountAmountRaw);
      const discount = discountApplied ? Math.max(0, Math.min(subtotal, requestedDiscount)) : 0;
      const total = Number(Math.max(0, subtotal - discount).toFixed(2));

      setTotals({ subtotal, discount, total });
    };

    recalc();
    form.addEventListener('input', recalc);
    form.addEventListener('change', recalc);

    return () => {
      form.removeEventListener('input', recalc);
      form.removeEventListener('change', recalc);
    };
  }, []);

  return (
    <div className="invoice-totals" ref={rootRef}>
      <p><strong>Subtotal calculado:</strong> {moneyFormat(totals.subtotal, currency)}</p>
      <p><strong>Descuento convenio:</strong> {moneyFormat(totals.discount, currency)}</p>
      <p><strong>Total estimado:</strong> {moneyFormat(totals.total, currency)}</p>
    </div>
  );
}
