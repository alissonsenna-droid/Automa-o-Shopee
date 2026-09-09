import Link from 'next/link';

// Este projeto é o SISTEMA CENTRAL (não uma landing page de vendas).
// Esta página raiz é apenas um painel de status/links úteis para quem
// acessar o domínio do sistema diretamente.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-semibold">DropBR</h1>
      <p className="text-muted-foreground">
        Este é o sistema central (backend + admin + checkout). Landing pages de
        vendas ficam fora deste projeto e se conectam via API.
      </p>
      <div className="flex gap-4">
        <Link href="/admin" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Painel administrativo
        </Link>
        <a
          href="https://github.com"
          className="rounded-md border border-border px-4 py-2"
        >
          Documentação (README)
        </a>
      </div>
    </main>
  );
}
