'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StorefrontHeader } from '@/components/storefront/header';
import { StorefrontFooter } from '@/components/storefront/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrderLookupEntryPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (orderNumber.trim()) router.push(`/pedido/${orderNumber.trim()}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Rastrear pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Número do pedido</Label>
                <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="DB-..." required />
              </div>
              <Button type="submit" className="w-full">
                Continuar
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <StorefrontFooter />
    </div>
  );
}
