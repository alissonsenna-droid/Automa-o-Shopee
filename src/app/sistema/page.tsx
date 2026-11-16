import Link from 'next/link';
import { FazzoLogo } from '@/components/brand/fazzo-logo';

// Painel de status/links úteis do sistema central (backend + admin + checkout).
// Antes vivia em "/" — movido pra cá quando "/" passou a ser a loja Fazzo.
export default function SystemStatusPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
      <FazzoLogo textSize="text-4xl" />
      <p className="text-muted-foreground">
        Este é o sistema central (backend + admin + checkout) da Fazzo. Landing
        pages de vendas externas se conectam via API.
      </p>
      <div className="flex gap-4">
        <Link href="/admin" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Painel administrativo
        </Link>
        <Link href="/" className="rounded-md border border-border px-4 py-2">
          Ver loja
        </Link>
      </div>
    </main>
  );
}
