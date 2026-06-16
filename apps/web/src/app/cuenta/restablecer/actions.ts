'use server';

import { redirect } from 'next/navigation';
import { resetPortalPassword } from '@/lib/api';

export async function resetPortalPasswordAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim();
  const newPassword = String(formData.get('newPassword') ?? '');

  if (!email || !code || !newPassword) {
    redirect('/cuenta/restablecer?error=1');
  }

  try {
    await resetPortalPassword({ email, code, newPassword });
    redirect('/cuenta/login?reset=1');
  } catch {
    redirect(`/cuenta/restablecer?error=1&email=${encodeURIComponent(email)}`);
  }
}
