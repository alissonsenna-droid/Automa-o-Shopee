'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Package,
  Tag,
  Link2,
  ShoppingCart,
  AlertCircle,
  Settings,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/actions', label: 'Ações pendentes', icon: AlertCircle },
  { href: '/admin/orders', label: 'Pedidos', icon: ShoppingCart },
  { href: '/admin/products', label: 'Produtos', icon: Package },
  { href: '/admin/offers', label: 'Ofertas', icon: Tag },
  { href: '/admin/landing-pages', label: 'Landing pages', icon: Link2 },
  { href: '/admin/analytics/products', label: 'Teste de produtos', icon: BarChart3 },
  { href: '/admin/settings', label: 'Configurações', icon: Settings },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="p-4 text-lg font-semibold">DropBR</div>
      <nav className="flex-1 space-y-1 px-2">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
              pathname === href ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <button onClick={logout} className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground hover:text-foreground">
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </aside>
  );
}
