import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { StorefrontHeader } from '@/components/storefront/header';
import { StorefrontFooter } from '@/components/storefront/footer';
import { OfferCard, type OfferWithProduct } from '@/components/storefront/offer-card';
import { BuyNowButton } from '@/components/storefront/buy-now-button';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import type { Product } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: offer } = await supabase.from('offers').select('*, products(*)').eq('slug', slug).eq('active', true).single();
  if (!offer) notFound();

  const product = offer.products as Product;
  const hasDiscount = offer.compare_price != null && offer.compare_price > offer.price;

  const { data: related } = await supabase
    .from('offers')
    .select('*, products!inner(name, slug, images, category)')
    .eq('active', true)
    .eq('checkout_enabled', true)
    .eq('products.category', product.category)
    .neq('id', offer.id)
    .limit(4);

  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
            {product.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- imagens vêm de URLs externas arbitrárias cadastradas pelo admin
              <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Sem foto</div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="font-heading text-2xl font-extrabold text-foreground">{product.name}</h1>
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-3xl font-extrabold text-primary">{formatCentsToBRL(toCents(offer.price))}</span>
              {hasDiscount && (
                <span className="text-base text-muted-foreground line-through">{formatCentsToBRL(toCents(offer.compare_price as number))}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {offer.shipping_price > 0 ? `Frete: ${formatCentsToBRL(toCents(offer.shipping_price))}` : 'Frete grátis'}
            </p>
            {product.description && <p className="text-sm leading-relaxed text-foreground">{product.description}</p>}

            <div className="mt-2">
              <BuyNowButton offerSlug={offer.slug} quantity={1} />
            </div>
            <p className="text-xs text-muted-foreground">Troca garantida em até 7 dias após o recebimento, conforme o CDC.</p>
          </div>
        </div>

        {related && related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Produtos relacionados</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {(related as unknown as OfferWithProduct[]).map((o) => (
                <OfferCard key={o.id} offer={o} />
              ))}
            </div>
          </section>
        )}
      </main>
      <StorefrontFooter />
    </div>
  );
}
