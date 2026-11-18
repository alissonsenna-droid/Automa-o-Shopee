import Link from 'next/link';
import { StorefrontHeader } from '@/components/storefront/header';
import { StorefrontFooter } from '@/components/storefront/footer';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="font-heading text-3xl font-extrabold text-foreground">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          O link que você acessou não existe ou o produto não está mais disponível.
        </p>
        {/* Mesmas classes do componente Button (variant="default") — Link
            não pode ficar dentro de <button>, então replica o estilo direto. */}
        <Link
          href="/"
          className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Voltar para a loja
        </Link>
      </main>
      <StorefrontFooter />
    </div>
  );
}
