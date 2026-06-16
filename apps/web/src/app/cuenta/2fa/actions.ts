'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyPortal2fa } from '@/lib/api';
import { CLIENT_2FA_CHALLENGE_COOKIE, CLIENT_SESSION_COOKIE } from '@/lib/session';

export async function verifyPortal2faAction(formData: FormData): Promise<void> {
  const code = String(formData.get('code') ?? '').trim();
  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(CLIENT_2FA_CHALLENGE_COOKIE)?.value;

  if (!challengeToken || !code) {
    redirect('/cuenta/login?error=2');
  }

  try {
    const response = await verifyPortal2fa({
      challengeToken,
      code,
    });

    cookieStore.set(CLIENT_SESSION_COOKIE, response.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
    cookieStore.delete(CLIENT_2FA_CHALLENGE_COOKIE);
    redirect('/cuenta');
  } catch {
    redirect('/cuenta/2fa?error=1');
  }
}
