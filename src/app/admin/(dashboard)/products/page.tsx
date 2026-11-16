'use client';

import { Fragment, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import type { Product, Supplier, SupplierProductRow } from '@/types/database';

const emptyForm = { name: '', slug: '', sku: '', price: '', compare_price: '', cost_price: '', category: 'geral' };

type SupplierLink = SupplierProductRow & { suppliers: { name: string } | null };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

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
        category: form.category || 'geral',
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
              <div>
                <Label>Categoria</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="ex: eletronicos, moda, casa" />
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
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <Fragment key={p.id}>
                  <TableRow>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.sku ?? '—'}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{formatCentsToBRL(toCents(p.price))}</TableCell>
                    <TableCell>{formatCentsToBRL(toCents(p.cost_price))}</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? 'success' : 'muted'}>{p.active ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedProductId(expandedProductId === p.id ? null : p.id)}
                      >
                        {expandedProductId === p.id ? 'Fechar' : 'Fornecedores'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedProductId === p.id && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/40 p-0">
                        <ProductSuppliers productId={p.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const emptyLinkForm = { supplier_id: '', supplier_cost: '', stock: '', supplier_sku: '', supplier_url: '' };

function ProductSuppliers({ productId }: { productId: string }) {
  const [links, setLinks] = useState<SupplierLink[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyLinkForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [linksRes, suppliersRes] = await Promise.all([
      fetch(`/api/supplier-products?product_id=${productId}`).then((r) => r.json()),
      fetch('/api/suppliers').then((r) => r.json()),
    ]);
    setLinks(linksRes.supplier_products ?? []);
    setSuppliers((suppliersRes.suppliers ?? []).filter((s: Supplier) => s.status === 'active'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só precisa recarregar quando o produto expandido muda
  }, [productId]);

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplier_id) return;
    setSaving(true);
    await fetch('/api/supplier-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        supplier_id: form.supplier_id,
        supplier_cost: Number(form.supplier_cost || 0),
        stock: Number(form.stock || 0),
        supplier_sku: form.supplier_sku || undefined,
        supplier_url: form.supplier_url || undefined,
      }),
    });
    setSaving(false);
    setForm(emptyLinkForm);
    load();
  }

  async function removeLink(id: string) {
    await fetch(`/api/supplier-products/${id}`, { method: 'DELETE' });
    load();
  }

  async function toggleActive(link: SupplierLink) {
    await fetch(`/api/supplier-products/${link.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !link.active }),
    });
    load();
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fornecedores deste produto</p>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum fornecedor vinculado ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow key={link.id}>
                <TableCell>{link.suppliers?.name ?? '—'}</TableCell>
                <TableCell>{formatCentsToBRL(toCents(link.supplier_cost))}</TableCell>
                <TableCell>{link.stock}</TableCell>
                <TableCell>{link.supplier_sku ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={link.active ? 'success' : 'muted'}>{link.active ? 'Ativo' : 'Inativo'}</Badge>
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(link)}>
                    {link.active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => removeLink(link.id)}>
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {suppliers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum fornecedor ativo cadastrado — crie um em <span className="font-medium">Fornecedores</span> primeiro.
        </p>
      ) : (
        <form onSubmit={addLink} className="grid grid-cols-5 items-end gap-3">
          <div>
            <Label>Fornecedor</Label>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Custo</Label>
            <Input type="number" step="0.01" value={form.supplier_cost} onChange={(e) => setForm({ ...form, supplier_cost: e.target.value })} />
          </div>
          <div>
            <Label>Estoque</Label>
            <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <Label>SKU do fornecedor</Label>
            <Input value={form.supplier_sku} onChange={(e) => setForm({ ...form, supplier_sku: e.target.value })} />
          </div>
          <Button type="submit" disabled={saving || !form.supplier_id}>
            {saving ? 'Vinculando...' : 'Vincular'}
          </Button>
        </form>
      )}
    </div>
  );
}
