-- Dados fictícios para desenvolvimento local.
-- Rode com: supabase db reset (aplica migrations + este seed)

insert into products (id, name, slug, sku, description, price, compare_price, cost_price, images, active)
values
  ('00000000-0000-0000-0000-000000000001', 'Tênis Preto X', 'tenis-preto-x', 'TENIS-X', 'Tênis casual unissex', 129.90, 199.90, 55.00, '[]', true),
  ('00000000-0000-0000-0000-000000000002', 'Bota X', 'bota-x', 'BOTA-X', 'Bota impermeável', 179.90, 249.90, 78.00, '[]', true);

insert into suppliers (id, name, email, phone, platform, status)
values
  ('10000000-0000-0000-0000-000000000001', 'Fornecedor Nacional A', 'contato@fornecedora.com.br', '11999990000', 'supplier_direct', 'active'),
  ('10000000-0000-0000-0000-000000000002', 'Fornecedor Nacional B', 'contato@fornecedorb.com.br', '11999991111', 'manual', 'active');

insert into supplier_products (supplier_id, product_id, supplier_sku, supplier_cost, stock, active, priority)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'SKU-A-TENIS', 59.90, 30, true, 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'SKU-B-TENIS', 64.90, 100, true, 2);

insert into offers (id, name, slug, product_id, price, compare_price, shipping_price, discount, active, landing_page_url)
values
  ('20000000-0000-0000-0000-000000000001', 'Tênis Preto V1', 'tenis-preto-v1', '00000000-0000-0000-0000-000000000001', 129.90, 199.90, 19.90, 0, true, 'https://exemplo.com/tenis-v1'),
  ('20000000-0000-0000-0000-000000000002', 'Tênis Preto V2', 'tenis-preto-v2', '00000000-0000-0000-0000-000000000001', 139.90, 199.90, 0, 0, true, 'https://exemplo.com/tenis-v2'),
  ('20000000-0000-0000-0000-000000000003', 'Tênis Preto Oferta', 'tenis-preto-oferta', '00000000-0000-0000-0000-000000000001', 119.90, 199.90, 19.90, 10.00, true, 'https://exemplo.com/tenis-oferta');

insert into landing_pages (name, url, offer_id, active, description)
values
  ('Tênis V1', 'https://exemplo.com/tenis-v1', '20000000-0000-0000-0000-000000000001', true, 'Variante de preço cheio'),
  ('Tênis V2', 'https://exemplo.com/tenis-v2', '20000000-0000-0000-0000-000000000002', true, 'Frete grátis, preço maior'),
  ('Tênis Oferta', 'https://exemplo.com/tenis-oferta', '20000000-0000-0000-0000-000000000003', true, 'Desconto agressivo para teste');

insert into system_settings (key, value)
values
  ('company', '{"name": "DropBR", "cnpj": "", "email": "", "whatsapp": ""}'),
  ('shipping_policy', '{"default_days": "7-15 dias úteis"}');
