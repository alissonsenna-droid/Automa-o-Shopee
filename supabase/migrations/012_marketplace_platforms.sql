-- Adiciona plataformas de marketplace usadas pela automação de preenchimento
-- de checkout (extensão de navegador — ver /fazzo-order-automation). Nenhuma
-- automação de compra roda no backend; isso só amplia o enum de
-- suppliers.platform para refletir de onde a compra é feita manualmente,
-- agora com dados pré-preenchidos.
alter type supplier_platform add value if not exists 'mercado_livre';
alter type supplier_platform add value if not exists 'tiktok_shop';
