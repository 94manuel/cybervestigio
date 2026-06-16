'use server';

import { redirect } from 'next/navigation';
import { requestPortalPasswordReset } from '@/lib/api';

export async function requestPortalRecoveryAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    redirect('/cuenta/recuperar?error=1');
  }

  try {
    await requestPortalPasswordReset({ email });
    redirect(`/cuenta/restablecer?requested=1&email=${encodeURIComponent(email)}`);
  } catch {
    redirect('/cuenta/recuperar?error=1');
  }
}
