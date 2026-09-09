/**
 * Seed de desenvolvimento via API (Supabase JS + service role), útil quando
 * você está usando um projeto Supabase hospedado (não o CLI local, que já
 * aplica supabase/migrations/seed.sql automaticamente com `supabase db reset`).
 *
 * Uso: npm run seed  (requer .env com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env antes de rodar o seed.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data: product, error: productError } = await supabase
    .from('products')
    .upsert({ name: 'Tênis Preto X', slug: 'tenis-preto-x', sku: 'TENIS-X', price: 129.9, compare_price: 199.9, cost_price: 55, active: true }, { onConflict: 'slug' })
    .select('*')
    .single();
  if (productError) throw productError;

  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .upsert({ name: 'Fornecedor Nacional A', platform: 'supplier_direct', status: 'active' })
    .select('*')
    .single();
  if (supplierError) throw supplierError;

  await supabase
    .from('supplier_products')
    .upsert(
      { supplier_id: supplier.id, product_id: product.id, supplier_cost: 59.9, stock: 30, active: true, priority: 1 },
      { onConflict: 'supplier_id,product_id' },
    );

  const { error: offerError } = await supabase
    .from('offers')
    .upsert({ name: 'Tênis Preto V1', slug: 'tenis-preto-v1', product_id: product.id, price: 129.9, shipping_price: 19.9, active: true }, { onConflict: 'slug' });
  if (offerError) throw offerError;

  console.log('Seed concluído: produto, fornecedor e oferta de exemplo criados/atualizados.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
