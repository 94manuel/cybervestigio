'use client';

import { useMemo, useState } from 'react';
import type { BillingService, InvoiceLineItem } from '@/lib/types';

type Props = {
  fieldName: string;
  catalog: BillingService[];
  initialItems?: InvoiceLineItem[];
};

type SelectedRow = {
  selected: boolean;
  price: number;
  quantity: number;
};

function moneyFormat(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function InvoiceCatalogBuilder({ fieldName, catalog, initialItems = [] }: Props) {
  const initialMap = useMemo(() => {
    const map = new Map<string, SelectedRow>();
    for (const catalogItem of catalog) {
      const existing = initialItems.find((item) => item.serviceId === catalogItem.id || item.title === catalogItem.service);
      map.set(catalogItem.id, {
        selected: Boolean(existing),
        price: existing ? Number(existing.unitPrice) : Number(catalogItem.recommendedPrice),
        quantity: existing ? Number(existing.quantity) : 1,
      });
    }
    return map;
  }, [catalog, initialItems]);

  const [rows, setRows] = useState<Record<string, SelectedRow>>(() => {
    const result: Record<string, SelectedRow> = {};
    for (const [id, value] of initialMap.entries()) result[id] = value;
    return result;
  });

  const bySector = useMemo(() => {
    const map = new Map<string, BillingService[]>();
    for (const item of catalog) {
      const items = map.get(item.sector) ?? [];
      items.push(item);
      map.set(item.sector, items);
    }
    return Array.from(map.entries());
  }, [catalog]);

  const serialized = useMemo(() => {
    return catalog
      .filter((item) => rows[item.id]?.selected)
      .map((item) => {
        const row = rows[item.id];
        const safePrice = Number.isFinite(row.price) ? row.price : 0;
        const safeQuantity = Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1;
        return `${item.service}|${safePrice}|${safeQuantity}|${item.id}`;
      })
      .join('\n');
  }, [catalog, rows]);

  const total = useMemo(() => {
    return catalog.filter((item) => rows[item.id]?.selected).reduce((acc, item) => {
      const row = rows[item.id];
      return acc + Number(row.price || 0) * Number(row.quantity || 1);
    }, 0);
  }, [catalog, rows]);

  function patch(id: string, patchValue: Partial<SelectedRow>) {
    setRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patchValue,
      },
    }));
  }

  return (
    <div className="invoice-catalog">
      <textarea name={fieldName} value={serialized} readOnly hidden />

      {bySector.map(([sector, items]) => (
        <details className="invoice-sector" key={sector} open>
          <summary>{sector}</summary>
          <div className="invoice-sector-grid">
            {items.map((item) => {
              const row = rows[item.id];
              const lineTotal = Number(row.price || 0) * Number(row.quantity || 1);
              return (
                <article className="invoice-catalog-row" key={item.id}>
                  <label className="invoice-catalog-select">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(event) => patch(item.id, { selected: event.target.checked })}
                    />
                    <strong>{item.service}</strong>
                  </label>
                  <p>{item.scope}</p>
                  <div className="invoice-catalog-controls">
                    <label>
                      Precio (COP)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.price}
                        onChange={(event) => patch(item.id, { price: Number(event.target.value || 0) })}
                      />
                    </label>
                    <label>
                      Cantidad
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity}
                        onChange={(event) => patch(item.id, { quantity: Number(event.target.value || 1) })}
                      />
                    </label>
                  </div>
                  <div className="invoice-catalog-meta">
                    <span>{item.priceNote ?? 'tarifa recomendada'}</span>
                    <strong>{moneyFormat(lineTotal)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </details>
      ))}

      <p className="admin-muted">Total servicios seleccionados: {moneyFormat(total)}</p>
    </div>
  );
}
