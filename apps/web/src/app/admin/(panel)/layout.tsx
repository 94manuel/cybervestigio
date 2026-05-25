import type { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { requireAdminToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireAdminToken();
  return (
    <div className="admin-body">
      <div className="admin-shell">
        <AdminSidebar />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
