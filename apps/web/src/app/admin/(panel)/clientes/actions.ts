'use server';

import { revalidatePath } from 'next/cache';
import { adminRequest } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';

function clientPayload(formData: FormData) {
  return {
    fullName: String(formData.get('fullName') ?? ''),
    cedula: String(formData.get('cedula') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    company: String(formData.get('company') ?? ''),
    active: String(formData.get('active') ?? 'on') === 'on',
  };
}

export async function createClientAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  await adminRequest('/admin/clients', token, {
    method: 'POST',
    body: JSON.stringify(clientPayload(formData)),
  });
  revalidatePath('/admin/clientes');
  revalidatePath('/admin/facturas');
}

export async function updateClientAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const id = String(formData.get('id') ?? '');
  await adminRequest(`/admin/clients/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(clientPayload(formData)),
  });
  revalidatePath('/admin/clientes');
  revalidatePath('/admin/facturas');
}
