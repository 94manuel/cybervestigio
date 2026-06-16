'use server';

import { revalidatePath } from 'next/cache';
import { adminRequest } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';

export async function createExternalUserAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();

  await adminRequest('/admin/external-users', token, {
    method: 'POST',
    body: JSON.stringify({
      fullName: String(formData.get('fullName') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? '') || undefined,
      password: String(formData.get('password') ?? '') || undefined,
      clientCedula: String(formData.get('clientCedula') ?? '') || undefined,
      company: String(formData.get('company') ?? '') || undefined,
      notifyByEmail: formData.get('notifyByEmail') === 'on',
    }),
  });

  revalidatePath('/admin/portal-clientes');
}

export async function updateExternalUserAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const id = String(formData.get('id') ?? '');

  await adminRequest(`/admin/external-users/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      fullName: String(formData.get('fullName') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? '') || undefined,
      password: String(formData.get('password') ?? '') || undefined,
      status: String(formData.get('status') ?? ''),
      notifyByEmail: formData.get('notifyByEmail') === 'on',
    }),
  });

  revalidatePath('/admin/portal-clientes');
}

export async function createExpedienteAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const userId = String(formData.get('userId') ?? '');
  const amountRaw = String(formData.get('receiptAmount') ?? '').trim();

  await adminRequest(`/admin/external-users/${userId}/expedientes`, token, {
    method: 'POST',
    body: JSON.stringify({
      title: String(formData.get('title') ?? ''),
      description: String(formData.get('description') ?? '') || undefined,
      createReceipt: formData.get('createReceipt') === 'on',
      receiptAmount: amountRaw ? Number(amountRaw) : undefined,
      receiptStatus: String(formData.get('receiptStatus') ?? '') || undefined,
      receiptDueDate: String(formData.get('receiptDueDate') ?? '') || undefined,
      receiptNotes: String(formData.get('receiptNotes') ?? '') || undefined,
    }),
  });

  revalidatePath('/admin/portal-clientes');
}

export async function updateReceiptStatusAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const id = String(formData.get('id') ?? '');

  await adminRequest(`/admin/receipts/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      status: String(formData.get('status') ?? 'POR_PAGAR'),
      dueDate: String(formData.get('dueDate') ?? '') || undefined,
      paidAt: String(formData.get('paidAt') ?? '') || undefined,
      notes: String(formData.get('notes') ?? '') || undefined,
    }),
  });

  revalidatePath('/admin/portal-clientes');
}
