'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CompanySettings {
  name: string;
  cnpj: string;
  email: string;
  whatsapp: string;
}

interface ProcessingSettings {
  min_margin_percent: number;
}

export default function SettingsPage() {
  const [company, setCompany] = useState<CompanySettings>({ name: '', cnpj: '', email: '', whatsapp: '' });
  const [processing, setProcessing] = useState<ProcessingSettings>({ min_margin_percent: 10 });
  const [saving, setSaving] = useState(false);
  const [savingProcessing, setSavingProcessing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    Promise.all([
      supabase.from('system_settings').select('value').eq('key', 'company').maybeSingle(),
      supabase.from('system_settings').select('value').eq('key', 'processing').maybeSingle(),
    ]).then(([companyRes, processingRes]) => {
      if (companyRes.data?.value) setCompany(companyRes.data.value as CompanySettings);
      if (processingRes.data?.value) setProcessing(processingRes.data.value as ProcessingSettings);
      setLoaded(true);
    });
  }, []);

  async function save() {
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.from('system_settings').upsert({ key: 'company', value: company, updated_at: new Date().toISOString() });
    setSaving(false);
  }

  async function saveProcessing() {
    setSavingProcessing(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.from('system_settings').upsert({ key: 'processing', value: processing, updated_at: new Date().toISOString() });
    setSavingProcessing(false);
  }

  if (!loaded) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome do sistema</Label>
            <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={company.cnpj} onChange={(e) => setCompany({ ...company, cnpj: e.target.value })} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={company.whatsapp} onChange={(e) => setCompany({ ...company, whatsapp: e.target.value })} />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processamento de pedidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Margem mínima (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={processing.min_margin_percent}
              onChange={(e) => setProcessing({ min_margin_percent: Number(e.target.value) })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Pedidos com margem abaixo disso viram &quot;problema&quot; em vez de serem aprovados sozinhos em
              Processar Pedidos.
            </p>
          </div>
          <Button onClick={saveProcessing} disabled={savingProcessing}>
            {savingProcessing ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
