'use server';

import { revalidatePath } from 'next/cache';
import { adminRequest } from '@/lib/api';
import { INVOICE_CATALOG } from '@/lib/invoice-catalog';
import { requireAdminToken } from '@/lib/session';

function billingPayload(formData: FormData) {
  return {
    sector: String(formData.get('sector') ?? ''),
    service: String(formData.get('service') ?? ''),
    scope: String(formData.get('scope') ?? ''),
    recommendedPrice: Number(formData.get('recommendedPrice') ?? 0),
    priceNote: String(formData.get('priceNote') ?? ''),
    active: String(formData.get('active') ?? 'on') === 'on',
    sortOrder: Number(formData.get('sortOrder') ?? 0),
  };
}

export async function createBillingServiceAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  await adminRequest('/admin/billing-services', token, {
    method: 'POST',
    body: JSON.stringify(billingPayload(formData)),
  });
  revalidatePath('/admin/cobros');
  revalidatePath('/admin/facturas');
}

export async function updateBillingServiceAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const id = String(formData.get('id') ?? '');
  await adminRequest(`/admin/billing-services/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(billingPayload(formData)),
  });
  revalidatePath('/admin/cobros');
  revalidatePath('/admin/facturas');
}

export async function bootstrapBillingCatalogAction(): Promise<void> {
  const token = await requireAdminToken();
  const existing = await adminRequest<Array<{ service: string; sector: string }>>('/admin/billing-services', token);
  const existingKey = new Set(existing.map((item) => `${item.sector}::${item.service}`));

  for (const [index, item] of INVOICE_CATALOG.entries()) {
    const key = `${item.sector}::${item.service}`;
    if (existingKey.has(key)) continue;

    await adminRequest('/admin/billing-services', token, {
      method: 'POST',
      body: JSON.stringify({
        sector: item.sector,
        service: item.service,
        scope: item.scope,
        recommendedPrice: item.recommendedPrice,
        priceNote: item.priceNote ?? '',
        active: true,
        sortOrder: index + 1,
      }),
    });
  }

  revalidatePath('/admin/cobros');
  revalidatePath('/admin/facturas');
}
