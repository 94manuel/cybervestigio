'use server';

import { revalidatePath } from 'next/cache';
import { adminRequest } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';

function parseLineItems(lines: string): Array<{ title: string; unitPrice: number; quantity: number; serviceId?: string }> {
  return lines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((value) => value.trim());
      const title = parts[0] ?? '';
      const unitPrice = Number(parts[1] ?? 0);
      const quantity = Number(parts[2] ?? 1) || 1;
      const serviceId = (parts[3] ?? '').trim();
      if (!title || Number.isNaN(unitPrice) || unitPrice < 0 || Number.isNaN(quantity) || quantity <= 0) {
        throw new Error('Formato invalido en items de factura. Use: Nombre|Precio|Cantidad(opcional).');
      }
      return { title, unitPrice, quantity, serviceId: serviceId || undefined };
    });
}

function invoicePayload(formData: FormData) {
  const serviceItemsRaw = String(formData.get('serviceItems') ?? '');
  const otherItemsRaw = String(formData.get('otherItems') ?? '');
  const lineItems = [...parseLineItems(serviceItemsRaw), ...parseLineItems(otherItemsRaw)];
  const subtotal = Number(lineItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0).toFixed(2));
  const agreementDiscountApplied = String(formData.get('agreementDiscountApplied') ?? '') === 'on';
  const agreementDiscountAmount = Number(formData.get('agreementDiscountAmount') ?? 0) || 0;
  const amount = Number(Math.max(0, subtotal - (agreementDiscountApplied ? agreementDiscountAmount : 0)).toFixed(2));

  return {
    invoiceNumber: String(formData.get('invoiceNumber') ?? ''),
    customerClientId: String(formData.get('customerClientId') ?? '').trim() || undefined,
    customerName: String(formData.get('customerName') ?? ''),
    customerEmail: String(formData.get('customerEmail') ?? ''),
    customerPhone: String(formData.get('customerPhone') ?? ''),
    company: String(formData.get('company') ?? ''),
    description: String(formData.get('description') ?? ''),
    lineItems,
    amount,
    currency: String(formData.get('currency') ?? 'COP'),
    dueDate: String(formData.get('dueDate') ?? ''),
    status: String(formData.get('status') ?? 'DRAFT'),
    notes: String(formData.get('notes') ?? ''),
    agreementDiscountApplied,
    agreementEntity: String(formData.get('agreementEntity') ?? ''),
    agreementDiscountAmount,
  };
}

export async function createInvoiceAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const invoice = await adminRequest<{ id: string }>('/admin/invoices', token, {
    method: 'POST',
    body: JSON.stringify(invoicePayload(formData)),
  });
  revalidatePath('/admin/facturas');
  revalidatePath(`/admin/facturas/${invoice.id}`);
}

export async function updateInvoiceAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const id = String(formData.get('id') ?? '');
  await adminRequest(`/admin/invoices/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(invoicePayload(formData)),
  });
  revalidatePath('/admin/facturas');
  revalidatePath(`/admin/facturas/${id}`);
}

export async function sendInvoiceAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const id = String(formData.get('id') ?? '');
  const recipientUserId = String(formData.get('recipientUserId') ?? '').trim();
  const recipientClientId = String(formData.get('recipientClientId') ?? '').trim();
  await adminRequest(`/admin/invoices/${id}/send`, token, {
    method: 'POST',
    body: JSON.stringify({
      to: String(formData.get('to') ?? ''),
      recipientUserId: recipientUserId || undefined,
      recipientClientId: recipientClientId || undefined,
      message: String(formData.get('message') ?? ''),
    }),
  });
  revalidatePath('/admin/facturas');
  revalidatePath(`/admin/facturas/${id}`);
}
