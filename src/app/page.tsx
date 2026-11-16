import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { StorefrontHeader } from '@/components/storefront/header';
import { StorefrontFooter } from '@/components/storefront/footer';
import { OfferCard, type OfferWithProduct } from '@/components/storefront/offer-card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createSupabaseAdminClient();
  const { data: offers } = await supabase
    .from('offers')
    .select('*, products(name, slug, images, category)')
    .eq('active', true)
    .eq('checkout_enabled', true)
    .order('created_at', { ascending: false })
    .limit(24);

  const list = (offers ?? []) as unknown as OfferWithProduct[];

  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-8 rounded-2xl bg-primary px-6 py-10 text-white">
          <h1 className="font-heading text-2xl font-extrabold sm:text-3xl">Chegou rápido, chegou certo. Chegou Fazzo.</h1>
          <p className="mt-2 max-w-xl text-white/85">
            Casa, moda, eletrônicos, pet e beleza em um só lugar — com entrega rastreada do início ao fim.
          </p>
        </div>

        <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Ofertas em destaque</h2>
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma oferta ativa cadastrada ainda. Cadastre produtos e ofertas no{' '}
            <a href="/admin/products" className="text-primary underline">
              painel administrativo
            </a>{' '}
            pra elas aparecerem aqui.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </main>
      <StorefrontFooter />
    </div>
  );
}
