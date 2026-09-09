import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: Promise<{ session: string }> }) {
  const { session: sessionId } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: session } = await supabase
    .from('checkout_sessions')
    .select('*, offers(*, products(*))')
    .eq('id', sessionId)
    .single();

  if (!session) notFound();

  if (new Date(session.expires_at).getTime() < Date.now()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">Este link de checkout expirou. Volte à página do produto e tente novamente.</p>
      </main>
    );
  }

  const offer = session.offers as { name: string; discount: number; products: { name: string; description: string | null; images: string[] } };
  const product = offer.products;
  const subtotal = session.price_snapshot * session.quantity;
  const total = Math.max(subtotal + session.shipping_snapshot - offer.discount, 0);

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl gap-8 p-6 lg:grid-cols-2 lg:p-10">
      <div>
        <Card>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
            <div className="flex items-center justify-between text-sm">
              <span>Quantidade</span>
              <span>{session.quantity}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCentsToBRL(toCents(subtotal))}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Frete</span>
              <span>{session.shipping_snapshot > 0 ? formatCentsToBRL(toCents(session.shipping_snapshot)) : 'Grátis'}</span>
            </div>
            {offer.discount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span>Desconto</span>
                <span>-{formatCentsToBRL(toCents(offer.discount))}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatCentsToBRL(toCents(total))}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <CheckoutForm sessionId={sessionId} />
    </main>
  );
}
