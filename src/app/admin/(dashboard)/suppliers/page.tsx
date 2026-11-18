'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Supplier, SupplierPlatform } from '@/types/database';

const PLATFORM_LABEL: Record<SupplierPlatform, string> = {
  shopee: 'Shopee',
  mercado_livre: 'Mercado Livre',
  tiktok_shop: 'TikTok Shop',
  supplier_direct: 'Direto com fornecedor',
  manual: 'Manual',
  api: 'API',
  other: 'Outro',
};

const emptyForm = { name: '', email: '', phone: '', platform: 'manual' as SupplierPlatform, notes: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/suppliers');
    const data = await res.json();
    setSuppliers(data.suppliers ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      platform: supplier.platform,
      notes: supplier.notes ?? '',
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveSupplier(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      platform: form.platform,
      notes: form.notes || undefined,
    };
    await fetch(editingId ? `/api/suppliers/${editingId}` : '/api/suppliers', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    cancelForm();
    load();
  }

  async function toggleStatus(supplier: Supplier) {
    await fetch(`/api/suppliers/${supplier.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: supplier.status === 'active' ? 'inactive' : 'active' }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fornecedores</h1>
        <Button onClick={() => (showForm ? cancelForm() : startCreate())}>{showForm ? 'Cancelar' : 'Novo fornecedor'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? 'Editar fornecedor' : 'Novo fornecedor'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveSupplier} className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Plataforma</Label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value as SupplierPlatform })}
                >
                  {Object.entries(PLATFORM_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="condições de revenda, prazo médio, contato..." />
              </div>
              <div className="col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar fornecedor'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {suppliers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum fornecedor cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{PLATFORM_LABEL[s.platform]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.email ?? s.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'active' ? 'success' : 'muted'}>{s.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(s)}>
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleStatus(s)}>
                        {s.status === 'active' ? 'Desativar' : 'Ativar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Pra vincular um fornecedor a um produto (custo, estoque, SKU), vá em <span className="font-medium">Produtos → Fornecedores</span> na linha do produto.
      </p>
    </div>
  );
}
