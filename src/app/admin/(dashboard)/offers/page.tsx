'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import type { Offer, Product } from '@/types/database';

type OfferWithProduct = Offer & { products: Pick<Product, 'name' | 'images'> };

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferWithProduct[]>([]);

  async function load() {
    const res = await fetch('/api/offers');
    const data = await res.json();
    setOffers(data.offers ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(offer: OfferWithProduct) {
    await fetch(`/api/offers/${offer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !offer.active }),
    });
    load();
  }

  async function duplicate(offer: OfferWithProduct) {
    const name = window.prompt('Nome da nova oferta', `${offer.name} (cópia)`);
    if (!name) return;
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    await fetch(`/api/offers/${offer.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ofertas</h1>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Landing page</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="font-medium">{offer.name}</TableCell>
                  <TableCell>{offer.products?.name}</TableCell>
                  <TableCell>{formatCentsToBRL(toCents(offer.price))}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{offer.landing_page_url}</TableCell>
                  <TableCell>
                    <Badge variant={offer.active ? 'success' : 'muted'}>{offer.active ? 'Ativa' : 'Inativa'}</Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(offer)}>
                      {offer.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => duplicate(offer)}>
                      Duplicar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
