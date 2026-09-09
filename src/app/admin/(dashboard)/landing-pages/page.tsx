'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { LandingPage, Offer } from '@/types/database';

type Row = LandingPage & { offers: Pick<Offer, 'name' | 'price' | 'slug'> };

export default function LandingPagesPage() {
  const [pages, setPages] = useState<Row[]>([]);

  useEffect(() => {
    fetch('/api/landing-pages')
      .then((r) => r.json())
      .then((data) => setPages(data.landing_pages ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Landing pages</h1>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Oferta</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                    <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {p.url}
                    </a>
                  </TableCell>
                  <TableCell>{p.offers?.name}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? 'success' : 'muted'}>{p.active ? 'Ativa' : 'Inativa'}</Badge>
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
