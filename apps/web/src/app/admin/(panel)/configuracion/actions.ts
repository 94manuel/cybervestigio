'use server';

import { revalidatePath } from 'next/cache';
import { adminRequest } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';

export async function updateSettingsAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const payload = {
    companyName: String(formData.get('companyName') ?? ''),
    heroTitle: String(formData.get('heroTitle') ?? ''),
    heroDescription: String(formData.get('heroDescription') ?? ''),
    contactEmail: String(formData.get('contactEmail') ?? ''),
    contactPhone: String(formData.get('contactPhone') ?? ''),
    location: String(formData.get('location') ?? ''),
  };
  await adminRequest('/admin/settings', token, { method: 'PATCH', body: JSON.stringify(payload) });
  revalidatePath('/');
  revalidatePath('/contacto');
  revalidatePath('/admin/configuracion');
}
