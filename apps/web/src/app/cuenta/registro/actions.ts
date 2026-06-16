'use server';

import { redirect } from 'next/navigation';
import { registerPortalUser } from '@/lib/api';

export async function portalRegisterAction(formData: FormData): Promise<void> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!fullName || !email || !password) {
    redirect('/cuenta/registro?error=1');
  }

  try {
    await registerPortalUser({
      fullName,
      email,
      phone: phone || undefined,
      password,
    });
    redirect('/cuenta/login?registered=1');
  } catch {
    redirect('/cuenta/registro?error=1');
  }
}
