'use server';

import { revalidatePath } from 'next/cache';
import { adminRequest } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';

function servicePayload(formData: FormData) {
  return {
    slug: String(formData.get('slug') ?? ''),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    icon: String(formData.get('icon') ?? 'search'),
    sortOrder: Number(formData.get('sortOrder') ?? 0),
    active: formData.get('active') === 'on',
  };
}

export async function createServiceAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  await adminRequest('/admin/services', token, { method: 'POST', body: JSON.stringify(servicePayload(formData)) });
  revalidatePath('/');
  revalidatePath('/servicios');
  revalidatePath('/admin/servicios');
}

export async function updateServiceAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const id = String(formData.get('id') ?? '');
  await adminRequest(`/admin/services/${id}`, token, { method: 'PATCH', body: JSON.stringify(servicePayload(formData)) });
  revalidatePath('/');
  revalidatePath('/servicios');
  revalidatePath('/admin/servicios');
}

export async function deleteServiceAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const id = String(formData.get('id') ?? '');
  await adminRequest(`/admin/services/${id}`, token, { method: 'DELETE' });
  revalidatePath('/');
  revalidatePath('/servicios');
  revalidatePath('/admin/servicios');
}
