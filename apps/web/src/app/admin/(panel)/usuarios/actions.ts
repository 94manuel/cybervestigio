'use server';

import { revalidatePath } from 'next/cache';
import { adminRequest } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';

function userPayload(formData: FormData) {
  const payload = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    role: String(formData.get('role') ?? 'USER'),
    password: String(formData.get('password') ?? ''),
  };

  if (!payload.password) {
    return {
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  }

  return payload;
}

export async function createUserAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  await adminRequest('/admin/users', token, {
    method: 'POST',
    body: JSON.stringify(userPayload(formData)),
  });
  revalidatePath('/admin/usuarios');
}

export async function updateUserAction(formData: FormData): Promise<void> {
  const token = await requireAdminToken();
  const id = String(formData.get('id') ?? '');
  await adminRequest(`/admin/users/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(userPayload(formData)),
  });
  revalidatePath('/admin/usuarios');
}
