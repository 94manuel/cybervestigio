'use server';

import { redirect } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

export async function submitContact(formData: FormData): Promise<void> {
  const payload = {
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    company: String(formData.get('company') ?? ''),
    service: String(formData.get('service') ?? ''),
    message: String(formData.get('message') ?? ''),
    consent: formData.get('consent') === 'on',
    website: String(formData.get('website') ?? ''),
  };

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}/contacts`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    redirect('/contacto?error=servicio');
  }

  if (!response.ok) redirect('/contacto?error=validacion');
  redirect('/contacto?enviado=1');
}
