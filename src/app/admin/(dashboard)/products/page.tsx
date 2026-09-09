'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import type { Product } from '@/types/database';

const emptyForm = { name: '', slug: '', sku: '', price: '', compare_price: '', cost_price: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data.products ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        sku: form.sku || undefined,
        price: Number(form.price),
        compare_price: form.compare_price ? Number(form.compare_price) : undefined,
        cost_price: Number(form.cost_price),
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm(emptyForm);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produtos</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancelar' : 'Novo produto'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo produto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createProduct} className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div>
                <Label>Preço</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div>
                <Label>Preço anterior</Label>
                <Input type="number" step="0.01" value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: e.target.value })} />
              </div>
              <div>
                <Label>Custo</Label>
                <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} required />
              </div>
              <div className="col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar produto'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.sku ?? '—'}</TableCell>
                  <TableCell>{formatCentsToBRL(toCents(p.price))}</TableCell>
                  <TableCell>{formatCentsToBRL(toCents(p.cost_price))}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? 'success' : 'muted'}>{p.active ? 'Ativo' : 'Inativo'}</Badge>
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
