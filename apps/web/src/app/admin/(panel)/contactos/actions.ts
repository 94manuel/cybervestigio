'use server';

import { revalidatePath } from 'next/cache';
import { adminRequest } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';

export async function updateContactStatusAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? 'NEW');
  await adminRequest(`/admin/contacts/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  revalidatePath('/admin');
  revalidatePath('/admin/contactos');
}
