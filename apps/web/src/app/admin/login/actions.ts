'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { SESSION_COOKIE } from '@/lib/session';

interface LoginResponse {
  accessToken: string;
}

export async function loginAction(formData: FormData): Promise<void> {
  const response = await fetch(`${getApiUrl()}/auth/login`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    }),
  }).catch(() => undefined);

  if (!response || !response.ok) redirect('/admin/login?error=1');
  const data = (await response.json()) as LoginResponse;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  redirect('/admin');
}
