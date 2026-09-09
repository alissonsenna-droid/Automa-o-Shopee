import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Registra uma ação em audit_logs. Nunca lança — auditoria não deve derrubar a request. */
export async function logAudit(entry: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from('audit_logs').insert({
      user_id: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (error) {
    console.error('Falha ao registrar audit log', error);
  }
}
