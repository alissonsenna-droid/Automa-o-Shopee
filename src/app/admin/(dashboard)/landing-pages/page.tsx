'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LandingPage, Offer } from '@/types/database';

type Row = LandingPage & { offers: Pick<Offer, 'name' | 'price' | 'slug'> };

const emptyForm = { name: '', url: '', offer_id: '', description: '' };

export default function LandingPagesPage() {
  const [pages, setPages] = useState<Row[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [pagesRes, offersRes] = await Promise.all([
      fetch('/api/landing-pages').then((r) => r.json()),
      fetch('/api/offers').then((r) => r.json()),
    ]);
    setPages(pagesRes.landing_pages ?? []);
    setOffers(offersRes.offers ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(page: Row) {
    setEditingId(page.id);
    setForm({ name: page.name, url: page.url, offer_id: page.offer_id, description: page.description ?? '' });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function savePage(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name,
      url: form.url,
      offer_id: form.offer_id,
      description: form.description || undefined,
    };
    await fetch(editingId ? `/api/landing-pages/${editingId}` : '/api/landing-pages', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    cancelForm();
    load();
  }

  async function toggleActive(page: Row) {
    await fetch(`/api/landing-pages/${page.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !page.active }),
    });
    load();
  }

  async function deletePage(page: Row) {
    if (!window.confirm(`Excluir a landing page "${page.name}"? Essa ação não pode ser desfeita.`)) return;
    await fetch(`/api/landing-pages/${page.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Landing pages</h1>
        <Button onClick={() => (showForm ? cancelForm() : startCreate())}>{showForm ? 'Cancelar' : 'Nova landing page'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? 'Editar landing page' : 'Nova landing page'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePage} className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                  required
                />
              </div>
              <div>
                <Label>Oferta</Label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
                  value={form.offer_id}
                  onChange={(e) => setForm({ ...form, offer_id: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar landing page'}
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
                <TableHead>URL</TableHead>
                <TableHead>Oferta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
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
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>
                      {p.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deletePage(p)}>
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
