'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FazzoLogo } from '@/components/brand/fazzo-logo';

export function StorefrontHeader() {
  // As categorias do menu vêm das ofertas ativas de verdade, não de uma
  // lista fixa. Uma lista fixa (ex: eletronicos/moda/casa/pet/beleza)
  // ficava sem nenhum produto real embaixo assim que o catálogo da loja
  // usasse categorias diferentes — o cliente navegava e achava a loja vazia.
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/offers?active=true')
      .then((r) => r.json())
      .then((data: { offers?: Array<{ products?: { category?: string } | null }> }) => {
        const unique = [...new Set((data.offers ?? []).map((o) => o.products?.category).filter((c): c is string => !!c))];
        setCategories(unique);
      })
      .catch(() => setCategories([]));
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-primary text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="shrink-0">
            <FazzoLogo textSize="text-2xl" className="[&_span]:!text-white" />
          </Link>
          <form action="/busca" className="flex min-w-0 flex-1 items-center">
            <input
              type="text"
              name="q"
              placeholder="O que você está procurando?"
              className="h-10 w-full min-w-0 rounded-l-md border-0 px-3 text-sm text-foreground outline-none"
            />
            <button
              type="submit"
              className="h-10 shrink-0 rounded-r-md bg-accent px-4 text-sm font-semibold text-accent-foreground"
            >
              Buscar
            </button>
          </form>
          {/* Não existe sistema de conta de cliente (login) — "/minha-conta"
              era um link morto. Aponta pra consulta pública de pedidos, que
              cumpre a mesma necessidade (acompanhar uma compra) sem precisar
              de autenticação. */}
          <Link href="/pedido" className="hidden shrink-0 text-sm font-medium sm:block">
            Meus pedidos
          </Link>
        </div>
        {categories.length > 0 && (
          <nav className="flex items-center gap-4 overflow-x-auto text-sm font-medium">
            {categories.map((c) => (
              <Link key={c} href={`/categoria/${c}`} className="shrink-0 capitalize text-white/85 hover:text-white">
                {c}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
