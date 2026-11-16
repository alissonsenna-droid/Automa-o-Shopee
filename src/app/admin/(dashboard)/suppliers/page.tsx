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
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/suppliers');
    const data = await res.json();
    setSuppliers(data.suppliers ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createSupplier(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        platform: form.platform,
        notes: form.notes || undefined,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm(emptyForm);
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
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancelar' : 'Novo fornecedor'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createSupplier} className="grid grid-cols-2 gap-4">
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
                  {saving ? 'Salvando...' : 'Criar fornecedor'}
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
                    <TableCell>
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
        Vincular um fornecedor a um produto específico (custo, estoque, SKU) ainda não tem tela própria — depende de uma API dedicada que ainda não existe.
      </p>
    </div>
  );
}
