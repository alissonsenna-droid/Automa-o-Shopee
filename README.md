# DropBR — Sistema Central de Dropshipping

Backend + painel admin + checkout, feito para ser o **cérebro único** de várias
landing pages independentes: produtos, ofertas, checkout, pagamentos (Appmax),
fornecedores, rastreamento e financeiro em um só lugar. **Este projeto não
inclui landing pages de vendas** — elas vivem fora e se conectam via API.

## ⚠️ Leia antes de tudo: limitações desta entrega

Este projeto foi escrito neste ambiente sandbox, que **não tem acesso ao
registro público do npm** (`registry.npmjs.org` bloqueado pela política de
rede da organização). Isso significa que:

- `npm install`, `npm run build`, `npm run typecheck`, `npm test` e `npm run lint`
  **não foram executados aqui** — o código foi escrito manualmente, com
  cuidado, mas só será validado de fato quando você rodar essas etapas no seu
  próprio computador (onde o npm funciona normalmente).
- Depois de baixar o projeto, rode nesta ordem e me avise se algum erro
  aparecer (cole o erro que eu corrijo):
  ```bash
  npm install
  npm run typecheck
  npm run lint
  npm test
  npm run build
  ```
- Os nomes de campos da integração Appmax (`src/lib/appmax/client.ts`) seguem
  a documentação pública em docs.appmax.com.br no momento da escrita, mas
  **valide contra o sandbox real da sua conta Appmax** antes de ir para
  produção — é o único arquivo que deve precisar de ajuste caso algum campo
  tenha nome diferente.
- Sobre a Shopee: por pedido explícito, **não há nenhuma automação de login,
  scraping, bypass de proteção ou compra automática** — só existe um
  provider manual (`ManualSupplierProvider`) e um placeholder
  (`ShopeeOfficialProvider`) documentando por que ele não está implementado
  (a Shopee não oferece API pública para isso e os Termos de Serviço dela
  proíbem tanto automação de compra quanto comprar para revenda comercial).

## Stack

Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth) +
Appmax (pagamentos) + Zod + React Hook Form. Ver `package.json`.

## Estrutura

```
src/
  app/
    api/                 # todas as rotas REST (ver lista completa abaixo)
    checkout/[session]/  # checkout público
    pedido/[orderNumber]/# acompanhamento público (anti-enumeração)
    admin/(auth)/login/  # login do painel
    admin/(dashboard)/   # painel admin (protegido por middleware.ts)
  lib/
    appmax/       # cliente Appmax, webhook, mapeamento de status
    suppliers/    # SupplierProvider, ManualSupplierProvider, seleção
    financial/    # cálculo de lucro (fonte única de verdade)
    validations/  # schemas Zod
    notifications/# camada de notificação (desligada por padrão)
    supabase/     # clientes server/browser/admin
supabase/
  migrations/     # schema completo (tabelas, índices, RLS, triggers)
  migrations/seed.sql
tests/            # vitest — financeiro, fornecedor, webhook, validações
scripts/seed.ts   # seed alternativo via API (projetos hospedados)
```

## Configurando o Supabase

1. Crie um projeto em supabase.com (ou rode local com `supabase start`).
2. Aplique as migrations, na ordem, pelo SQL Editor do Supabase Studio ou via
   CLI: `supabase db push` (hospedado) ou `supabase db reset` (local — já
   aplica `seed.sql` também).
3. Copie `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
   `SUPABASE_SERVICE_ROLE_KEY` para `.env`.
4. Crie seu usuário admin: cadastre-se normalmente pelo Supabase Auth (ex:
   pelo painel do Supabase, "Add user"), depois rode no SQL Editor:
   ```sql
   update profiles set role = 'admin' where id = '<uuid-do-usuario>';
   ```
   (todo novo usuário nasce como `operator` — ver trigger `handle_new_user`).

## Configurando a Appmax

1. Crie uma aplicação em https://docs.appmax.com.br (ambiente sandbox).
2. Preencha `APPMAX_API_KEY`, `APPMAX_SECRET`, `APPMAX_WEBHOOK_SECRET` no
   `.env`. Mantenha `APPMAX_ENVIRONMENT=sandbox` até validar tudo.
3. Configure o apphook/webhook da Appmax apontando para:
   `https://SEU_DOMINIO/api/webhooks/appmax`
4. **Nunca** coloque essas credenciais no código — só via variáveis de
   ambiente (Vercel → Project Settings → Environment Variables).

## Conectando uma landing page

Qualquer landing page (HTML puro, React, Shopify, o que for) só precisa de
duas coisas:

1. Um botão "Comprar" que chama:
   ```js
   const res = await fetch('https://seu-dominio.com/api/checkout/session', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       offer_slug: 'tenis-preto-v1',
       utm_source: 'facebook',
       utm_campaign: 'teste-01',
     }),
   });
   const { checkout_url } = await res.json();
   window.location.href = checkout_url;
   ```
2. Nada mais. O sistema resolve preço, frete e desconto reais a partir do
   banco — a landing page nunca envia (nem precisa saber) o preço.

Para testar um novo produto: cadastre o produto → cadastre um fornecedor →
vincule o fornecedor ao produto (custo/estoque) → crie uma oferta (preço +
landing page) → ative → aponte o tráfego para a landing → acompanhe tudo em
`/admin/analytics/products`. Nenhum passo exige mexer em código.

## Rotas de API

Ver a lista completa comentada em cada arquivo sob `src/app/api/`. Resumo:

| Rota | Método | Uso |
|---|---|---|
| `/api/checkout/session` | POST | landing page → cria sessão de checkout |
| `/api/orders` | POST | checkout → finaliza pedido + pagamento Appmax |
| `/api/orders` | GET | admin → lista com filtros |
| `/api/orders/[id]` | GET | admin → detalhe completo |
| `/api/orders/by-number/[orderNumber]?contact=` | GET | público → acompanhamento (anti-enumeração) |
| `/api/webhooks/appmax` | POST | Appmax → confirmação de pagamento (idempotente) |
| `/api/products`, `/api/products/[idOrSlug]` | GET/POST/PUT/DELETE | CRUD de produtos |
| `/api/offers`, `/api/offers/[idOrSlug]` | GET/POST/PUT/DELETE | CRUD de ofertas |
| `/api/offers/[id]/duplicate` | POST | duplica oferta (testes A/B) |
| `/api/landing-pages`, `/api/landing-pages/[id]` | GET/POST/PUT/DELETE | CRUD de landing pages |
| `/api/suppliers`, `/api/suppliers/[id]` | GET/POST/PUT | CRUD de fornecedores |
| `/api/supplier-orders/[id]/send` | POST | aciona fornecedor (idempotente) |
| `/api/supplier-orders/[id]/tracking` | POST | cadastra rastreio |
| `/api/tracking/[orderId]` | GET | uso interno (admin) |

## Idempotência (onde e como)

- **Checkout duplo clique**: `checkout_sessions.order_id` + índice único
  `orders.checkout_session_id` — a segunda tentativa retorna o pedido já
  criado em vez de duplicar.
- **Webhook duplicado**: `webhook_events` tem `unique(provider, event_id)` —
  a segunda chamada recebe erro de constraint e é ignorada sem reprocessar.
- **Enviar ao fornecedor duas vezes**: `supplier_orders.order_id` é único, e
  a rota `/send` só age quando `status = 'pending'`.

## Deploy (Vercel)

1. Suba o repositório no GitHub.
2. Importe na Vercel, configure todas as variáveis de `.env.example`.
3. Configure o webhook da Appmax para o domínio de produção.
4. `npm run build` deve passar antes do deploy — rode local primeiro.

## O que ainda vale a pena evoluir

- Confirmar os nomes de campo reais da Appmax no seu sandbox (ver aviso no
  topo) e ajustar `src/lib/appmax/client.ts` se necessário.
- Trocar os componentes de UI hand-rolled em `src/components/ui` pelos
  componentes reais do shadcn/ui rodando `npx shadcn@latest add ...` (aqui
  não foi possível baixar o CLI pela mesma restrição de rede) — a API deles
  é praticamente a mesma, então a migração é direta.
- Implementar um `SupplierApiProvider` real para o(s) fornecedor(es)
  nacionais de dropshipping que você decidir usar (ver `lib/suppliers`).
- Ativar notificações reais (e-mail/WhatsApp) trocando os providers noop em
  `lib/notifications` e setando `NOTIFICATIONS_ENABLED=true`.
