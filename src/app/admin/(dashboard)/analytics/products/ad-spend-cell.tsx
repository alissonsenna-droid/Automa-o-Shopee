'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AdSpendCell({
  offerId,
  initialValue,
  metadata,
}: {
  offerId: string;
  initialValue: number;
  metadata: Record<string, unknown>;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(initialValue || ''));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/offers/${offerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      // Merge pra não apagar outras chaves que já existam em metadata.
      body: JSON.stringify({ metadata: { ...metadata, ad_spend: Number(value || 0) } }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-24 text-xs"
        placeholder="0,00"
      />
      <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={save} disabled={saving}>
        {saving ? '...' : 'Salvar'}
      </Button>
    </div>
  );
}
