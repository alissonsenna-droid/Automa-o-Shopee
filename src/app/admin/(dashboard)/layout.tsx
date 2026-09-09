import { AdminSidebar } from '@/components/admin/sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="min-h-screen flex-1 bg-muted/30 p-8">{children}</div>
    </div>
  );
}
