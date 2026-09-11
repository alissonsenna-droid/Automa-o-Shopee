import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { OrderDetailClient } from './order-detail-client';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*, customers(*), addresses(*), offers(name), supplier_orders(*)')
    .eq('id', id)
    .single();

  if (!order) notFound();

  return <OrderDetailClient order={order as any} />;
}
