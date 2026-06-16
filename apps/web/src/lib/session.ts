import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const SESSION_COOKIE = 'cv_admin_token';
export const CLIENT_SESSION_COOKIE = 'cv_client_token';
export const CLIENT_2FA_CHALLENGE_COOKIE = 'cv_client_2fa_challenge';

export async function requireAdminToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/admin/login');
  return token;
}

export async function requireClientToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!token) redirect('/cuenta/login');
  return token;
}
