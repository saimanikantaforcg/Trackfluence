import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import AdminClient from '@/components/admin/admin-client';

export default async function AdminPage() {
  const cookieStore = await cookies();
  // Token is read client-side from localStorage; server shell fetches stats
  // using the tf_token cookie if set (optional SSR), else defers to client
  const token = cookieStore.get('tf_token')?.value ?? '';

  let users = null;
  let stats = null;

  if (token) {
    try {
      [users, stats] = await Promise.all([
        api.adminListUsers(token),
        api.adminGetStats(token),
      ]);
    } catch {
      // falls through to client-side fetch
    }
  }

  return <AdminClient initialUsers={users} initialStats={stats} />;
}
