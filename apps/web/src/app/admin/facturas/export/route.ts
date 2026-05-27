import { NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';

export async function GET() {
  const token = await requireAdminToken();
  const response = await fetch(`${getApiUrl()}/admin/invoices/export`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`No fue posible exportar facturas: ${response.status}`);
  }

  const file = await response.arrayBuffer();

  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="facturas-cybervestigio.xlsx"',
    },
  });
}
