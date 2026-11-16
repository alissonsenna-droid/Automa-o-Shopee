'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function BuyNowButton({ offerSlug, quantity }: { offerSlug: string; quantity: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_slug: offerSlug, quantity, referrer: typeof document !== 'undefined' ? document.referrer : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível iniciar o checkout.');
        setLoading(false);
        return;
      }
      window.location.href = data.checkout_url;
    } catch {
      setError('Falha de conexão. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="accent" size="lg" className="w-full" onClick={handleClick} disabled={loading}>
        {loading ? 'Abrindo checkout...' : 'Comprar agora'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
