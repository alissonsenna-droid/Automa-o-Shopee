import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { StorefrontHeader } from '@/components/storefront/header';
import { StorefrontFooter } from '@/components/storefront/footer';
import { OfferCard, type OfferWithProduct } from '@/components/storefront/offer-card';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: offers } = await supabase
    .from('offers')
    .select('*, products!inner(name, slug, images, category)')
    .eq('active', true)
    .eq('checkout_enabled', true)
    .eq('products.category', category)
    .order('created_at', { ascending: false });

  const list = (offers ?? []) as unknown as OfferWithProduct[];

  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-6 font-heading text-xl font-extrabold capitalize text-foreground">{category}</h1>
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma oferta ativa nessa categoria ainda.
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
