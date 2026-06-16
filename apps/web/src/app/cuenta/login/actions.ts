'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginPortalUser } from '@/lib/api';
import { CLIENT_2FA_CHALLENGE_COOKIE, CLIENT_SESSION_COOKIE } from '@/lib/session';

export async function portalLoginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/cuenta/login?error=1');
  }

  try {
    const response = await loginPortalUser({ email, password });
    const cookieStore = await cookies();
    cookieStore.delete(CLIENT_SESSION_COOKIE);
    cookieStore.set(CLIENT_2FA_CHALLENGE_COOKIE, response.challengeToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });
    redirect('/cuenta/2fa');
  } catch {
    redirect('/cuenta/login?error=1');
  }
}
