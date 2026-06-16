'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  addPortalCartItem,
  checkoutPortalCart,
  payPortalOrder,
  removePortalCartItem,
  updatePortalCartItem,
} from '@/lib/api';
import { CLIENT_SESSION_COOKIE, requireClientToken } from '@/lib/session';
import type { PaymentMethod } from '@/lib/types';

export async function clientLogoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_SESSION_COOKIE);
  redirect('/cuenta/login');
}

export async function addServiceToCartAction(formData: FormData): Promise<void> {
  const token = await requireClientToken();
  const serviceId = String(formData.get('serviceId') ?? '').trim();
  const quantity = Number(formData.get('quantity') ?? '1');

  if (!serviceId) {
    redirect('/cuenta/servicios?error=1');
  }

  await addPortalCartItem(token, {
    serviceId,
    quantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
  });

  revalidatePath('/cuenta/servicios');
  revalidatePath('/cuenta/carrito');
}

export async function updateCartItemAction(formData: FormData): Promise<void> {
  const token = await requireClientToken();
  const itemId = String(formData.get('itemId') ?? '').trim();
  const quantity = Number(formData.get('quantity') ?? '1');

  if (!itemId) {
    redirect('/cuenta/carrito?error=1');
  }

  await updatePortalCartItem(token, itemId, {
    quantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
  });

  revalidatePath('/cuenta/carrito');
}

export async function removeCartItemAction(formData: FormData): Promise<void> {
  const token = await requireClientToken();
  const itemId = String(formData.get('itemId') ?? '').trim();
  if (!itemId) {
    redirect('/cuenta/carrito?error=1');
  }

  await removePortalCartItem(token, itemId);
  revalidatePath('/cuenta/carrito');
}

export async function checkoutCartAction(formData: FormData): Promise<void> {
  const token = await requireClientToken();
  const paymentMethod = String(formData.get('paymentMethod') ?? 'NEQUI') as PaymentMethod;
  const paymentNotes = String(formData.get('paymentNotes') ?? '').trim();

  await checkoutPortalCart(token, {
    paymentMethod,
    paymentNotes: paymentNotes || undefined,
  });

  revalidatePath('/cuenta');
  revalidatePath('/cuenta/carrito');
  redirect('/cuenta?checkout=1');
}

export async function reportOrderPaymentAction(formData: FormData): Promise<void> {
  const token = await requireClientToken();
  const orderId = String(formData.get('orderId') ?? '').trim();
  const paymentReference = String(formData.get('paymentReference') ?? '').trim();
  const paymentNotes = String(formData.get('paymentNotes') ?? '').trim();

  if (!orderId || !paymentReference) {
    redirect('/cuenta?error=1');
  }

  await payPortalOrder(token, orderId, {
    paymentReference,
    paymentNotes: paymentNotes || undefined,
  });

  revalidatePath('/cuenta');
  revalidatePath('/cuenta/drive');
  redirect('/cuenta?paid=1');
}
