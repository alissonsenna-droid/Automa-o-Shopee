import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { StorefrontHeader } from '@/components/storefront/header';
import { StorefrontFooter } from '@/components/storefront/footer';
import { OfferCard, type OfferWithProduct } from '@/components/storefront/offer-card';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();
  const supabase = createSupabaseAdminClient();

  let list: OfferWithProduct[] = [];
  if (query) {
    const { data: offers } = await supabase
      .from('offers')
      .select('*, products!inner(name, slug, images, category)')
      .eq('active', true)
      .eq('checkout_enabled', true)
      .ilike('products.name', `%${query}%`)
      .order('created_at', { ascending: false });
    list = (offers ?? []) as unknown as OfferWithProduct[];
  }

  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-6 font-heading text-xl font-extrabold text-foreground">
          {query ? (
            <>
              Resultados para &ldquo;{query}&rdquo;
            </>
          ) : (
            'Digite algo pra buscar'
          )}
        </h1>
        {query && list.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nada encontrado para essa busca.
          </p>
        )}
        {list.length > 0 && (
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
