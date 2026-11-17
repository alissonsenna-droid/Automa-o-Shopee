'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import type { Offer, Product } from '@/types/database';

type OfferWithProduct = Offer & { products: Pick<Product, 'name' | 'images'> };

const emptyForm = {
  name: '',
  slug: '',
  product_id: '',
  price: '',
  compare_price: '',
  shipping_price: '0',
  discount: '0',
  landing_page_url: '',
  checkout_enabled: true,
  tracking_enabled: true,
};

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [offersRes, productsRes] = await Promise.all([
      fetch('/api/offers').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ]);
    setOffers(offersRes.offers ?? []);
    setProducts(productsRes.products ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(offer: OfferWithProduct) {
    setEditingId(offer.id);
    setForm({
      name: offer.name,
      slug: offer.slug,
      product_id: offer.product_id,
      price: String(offer.price),
      compare_price: offer.compare_price != null ? String(offer.compare_price) : '',
      shipping_price: String(offer.shipping_price),
      discount: String(offer.discount),
      landing_page_url: offer.landing_page_url ?? '',
      checkout_enabled: offer.checkout_enabled,
      tracking_enabled: offer.tracking_enabled,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveOffer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name,
      slug: form.slug,
      product_id: form.product_id,
      price: Number(form.price),
      compare_price: form.compare_price ? Number(form.compare_price) : undefined,
      shipping_price: Number(form.shipping_price || 0),
      discount: Number(form.discount || 0),
      landing_page_url: form.landing_page_url || undefined,
      checkout_enabled: form.checkout_enabled,
      tracking_enabled: form.tracking_enabled,
    };
    await fetch(editingId ? `/api/offers/${editingId}` : '/api/offers', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    cancelForm();
    load();
  }

  async function toggleActive(offer: OfferWithProduct) {
    await fetch(`/api/offers/${offer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !offer.active }),
    });
    load();
  }

  async function deleteOffer(offer: OfferWithProduct) {
    if (!window.confirm(`Excluir a oferta "${offer.name}"? Essa ação não pode ser desfeita.`)) return;
    await fetch(`/api/offers/${offer.id}`, { method: 'DELETE' });
    load();
  }

  async function duplicate(offer: OfferWithProduct) {
    const name = window.prompt('Nome da nova oferta', `${offer.name} (cópia)`);
    if (!name) return;
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ofertas</h1>
        <Button onClick={() => (showForm ? cancelForm() : startCreate())}>{showForm ? 'Cancelar' : 'Nova oferta'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? 'Editar oferta' : 'Nova oferta'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveOffer} className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </div>
              <div>
                <Label>Produto</Label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Preço</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div>
                <Label>Preço anterior (de/por)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.compare_price}
                  onChange={(e) => setForm({ ...form, compare_price: e.target.value })}
                />
              </div>
              <div>
                <Label>Frete</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.shipping_price}
                  onChange={(e) => setForm({ ...form, shipping_price: e.target.value })}
                />
              </div>
              <div>
                <Label>Desconto</Label>
                <Input type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
              </div>
              <div>
                <Label>Landing page (URL)</Label>
                <Input
                  value={form.landing_page_url}
                  onChange={(e) => setForm({ ...form, landing_page_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2 flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.checkout_enabled}
                    onChange={(e) => setForm({ ...form, checkout_enabled: e.target.checked })}
                  />
                  Checkout habilitado
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.tracking_enabled}
                    onChange={(e) => setForm({ ...form, tracking_enabled: e.target.checked })}
                  />
                  Tracking habilitado
                </label>
              </div>
              <div className="col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar oferta'}
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
                    <Button size="sm" variant="outline" onClick={() => startEdit(offer)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(offer)}>
                      {offer.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => duplicate(offer)}>
                      Duplicar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteOffer(offer)}>
                      Excluir
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
