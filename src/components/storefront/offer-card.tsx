import Link from 'next/link';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import type { Offer, Product } from '@/types/database';

export type OfferWithProduct = Offer & {
  products: Pick<Product, 'name' | 'slug' | 'images' | 'category'> | null;
};

export function OfferCard({ offer }: { offer: OfferWithProduct }) {
  const product = offer.products;
  if (!product) return null;
  const image = product.images?.[0];
  const hasDiscount = offer.compare_price != null && offer.compare_price > offer.price;

  return (
    <Link
      href={`/produto/${offer.slug}`}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="aspect-square w-full bg-muted">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagens vêm de URLs externas arbitrárias cadastradas pelo admin
          <img src={image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Sem foto</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm text-foreground">{product.name}</p>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="font-heading text-lg font-extrabold text-primary">{formatCentsToBRL(toCents(offer.price))}</span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">{formatCentsToBRL(toCents(offer.compare_price as number))}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
