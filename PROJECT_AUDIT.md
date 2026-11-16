# PROJECT_AUDIT.md — Fazzo (ex-DropBR)

Auditoria feita em 16/11/2026, lendo o código real (não descrições antigas de README). Cada linha abaixo foi verificada no arquivo/migration indicado — nada aqui é suposição.

**Stack real**: Next.js 15 (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth, projeto `dropbr`, região sa-east-1) + Appmax (pagamentos) + Zod + React Hook Form + Vitest. Banco já restaurado e `.env` configurado nesta sessão.

## Legenda

- 🟢 **FUNCIONAL E TESTADO** — código real, ligado ao banco real, verificado nesta auditoria ou por teste automatizado.
- 🟡 **PARCIALMENTE FUNCIONAL** — a API/lógica existe, mas falta uma peça (tela, dado, integração) pra ser utilizável de ponta a ponta.
- 🔵 **APENAS INTERFACE** — existe tela, mas sem dado real por trás (nenhum caso encontrado nesta auditoria — sinal positivo).
- ⚪ **NÃO IMPLEMENTADO** — não existe nenhum código ainda.
- 🟣 **DEPENDENTE DE INTEGRAÇÃO EXTERNA** — código pronto, mas bloqueado por credencial/conta de terceiro que só você pode configurar.

## Tabela de auditoria

| Módulo | Estado | Arquivos | O que existe | O que falta | Prioridade | Ação recomendada |
|---|---|---|---|---|---|---|
| Marca/identidade visual | 🟢 | `src/app/globals.css`, `tailwind.config.ts`, `src/components/brand/fazzo-logo.tsx`, `src/app/icon.svg`, `src/app/layout.tsx` | Paleta navy/teal/magenta, Poppins+Inter, logo "FAZZO" aplicado na home, login admin e sidebar | Aplicar a mesma marca na loja (ainda não existe) | Alta | Reaproveitar `FazzoLogo` na loja |
| Banco de dados | 🟢 | `supabase/migrations/001–009` | 9 migrations aplicadas (enums, tabelas core, ofertas, pedidos, pagamentos, sistema, triggers, RLS, constraint de e-mail, app_settings), projeto Supabase `dropbr` restaurado e conectado | Sem tabela/campo de **categoria** de produto; sem suporte a **carrinho multi-produto** (ver nota de arquitetura abaixo) | Alta | Migration aditiva para categoria antes da loja; avaliar migration de carrinho depois |
| Autenticação admin | 🟢 | `src/middleware.ts`, `src/lib/supabase/server.ts`, `src/lib/auth.ts`, RLS (`is_staff`/`is_admin`) | Supabase Auth + RLS real, middleware protege `/admin/*`, testado nesta sessão (login funcionando com usuário real) | — | — | — |
| Dashboard admin | 🟢 | `src/app/admin/(dashboard)/page.tsx` | Faturamento hoje/mês, lucro, ticket médio, contagens por status — tudo calculado de `orders` reais | Números ficam zerados até existir pedido real (correto, não é bug) | — | — |
| Ações pendentes | 🟢 | `.../actions/page.tsx` | 4 filas reais (pagamento pendente, aguardando fornecedor, problema, enviado há 15+ dias sem entrega), com cliente, valor e botão de próxima ação por item (seção 6.4 do prompt mestre) | — | — | — |
| Produtos (admin) | 🟢 | `.../products/page.tsx`, `/api/products` | CRUD real (nome, slug, sku, preço, custo, ativo) | Sem campo categoria; sem upload de imagem (só array de URLs); sem variações | Alta | Add campo categoria + variações antes de ligar à loja |
| Ofertas (admin) | 🟢 | `.../offers/page.tsx`, `/api/offers/*` | CRUD real + duplicar oferta + ativar/desativar | — | — | — |
| Landing pages (admin) | 🟢 | `.../landing-pages/page.tsx`, `/api/landing-pages/*` | CRUD real | — | — | — |
| Pedidos (admin) | 🟢 | `.../orders/page.tsx`, `.../orders/[id]/*` | Lista + detalhe real, enviar ao fornecedor (idempotente), registrar rastreio | — | — | — |
| Teste de produtos (analytics) | 🟢 | `.../analytics/products/page.tsx` | Conversão, faturamento, custo, lucro, margem **por oferta real** | CPA/ROAS fica null até ter custo de tráfego registrado (correto) | — | — | Isso **não é** o módulo de "mineração de produtos" do prompt — é analytics de ofertas já cadastradas |
| Checkout (sessão) | 🟢 (mas limitado) | `/api/checkout/session`, `/checkout/[session]/page.tsx`, `checkout-form.tsx` | Fluxo real: landing externa → cria sessão → formulário → Appmax → Pix exibido. Idempotente (unique em `checkout_session_id`) | **Arquitetura é 1 oferta por sessão/pedido** (campo `orders.offer_id` é `not null`, `supplier_orders` é `unique(order_id)`) — não existe carrinho com produtos diferentes num só pedido | — | Ver "Nota de arquitetura" abaixo |
| Pagamento Appmax | 🟣 | `src/lib/appmax/*`, `/api/webhooks/appmax` | Cliente, parsing de webhook, idempotência por `(provider, event_id)`, mapeamento de status — tudo com testes passando | `APPMAX_API_KEY`/`SECRET`/`WEBHOOK_SECRET` vazios no `.env`. **Confirmado nesta auditoria**: os 7 pedidos reais já existentes no banco (Cinta Catraca Smart, de 12/09/2026) **também** estão todos com `status=problem` / `pagamento_recusado` — ou seja, o Appmax nunca funcionou de ponta a ponta em produção, nem antes desta sessão | **Alta — bloqueia qualquer venda real** | Você precisa confirmar/renovar as credenciais Appmax e colar no `.env` |
| **Loja virtual (storefront)** | 🟢 | `src/app/page.tsx`, `src/app/categoria/[category]`, `src/app/produto/[slug]`, `src/app/busca`, `src/components/storefront/*` | Construída e **testada de ponta a ponta nesta sessão**: home com ofertas reais → categoria → busca → produto → "Comprar agora" → sessão de checkout real → formulário existente → pedido criado no banco → aparece no admin. Testado com produto `[DEV]` criado só para o teste e depois removido (pedido/cliente de teste apagados; produto/oferta `[DEV]` ficaram como exemplo visível). | Carrinho multi-produto (ver nota de arquitetura); upload de imagem; variações | — | — |
| Fornecedores (tela admin) | 🟢 | `src/app/admin/(dashboard)/suppliers/page.tsx`, `/api/supplier-products/*` | Listar/criar/ativar fornecedor; **vincular fornecedor a produto (custo/estoque/SKU) agora tem API e tela**, dentro de Produtos → "Fornecedores" por linha — testado ao vivo de ponta a ponta | — | — | — |
| Mineração de produtos | ⚪ | — | Nada | Pesquisa em marketplaces, scoring, candidatos a catálogo | Baixa agora (depende de loja+fornecedores prontos primeiro) | Fase futura |
| Central Pix dedicada | 🟡 | lógica espalhada em checkout + webhook | Pix já é gerado e exibido no checkout do cliente | Não existe tela central no **admin** agregando "Pix a pagar ao fornecedor" como o prompt descreve (isso é sobre o admin pagar o fornecedor, não o cliente pagar a loja) | Média | Fase futura — depende do processamento de pedidos existir |
| Processamento em lote / seleção de fornecedor | ⚪ | `src/lib/suppliers/selection.ts` tem a lógica de **escolher** fornecedor; não existe o botão/fluxo "PROCESSAR PEDIDOS" em lote | Função de seleção isolada existe e tem teste | Fila, lote, UI | Baixa agora | Fase futura |
| Agentes de IA | ⚪ | — | Nada no código — é conceito do prompt, zero backend | Tudo | Baixa agora | Não fingir que existe |
| Clientes (tela admin) | 🟢 | `src/app/admin/(dashboard)/customers/page.tsx`, `/api/customers` | Listagem + busca, testado ao vivo com clientes reais já existentes | Sem detalhe/histórico de pedidos por cliente | Baixa | Fase futura |
| Marketing / Tracking / SEO / CRM | ⚪ | — | Nada | Tudo | Baixa agora | Fase futura |
| Testes automatizados | 🟢 | `tests/*.test.ts`, `vitest.config.ts` | 26 testes passando (financeiro, seleção de fornecedor, webhook Appmax, validações, utils) — rodados nesta sessão pela primeira vez | Sem teste e2e de loja (não existia loja) | Alta | Adicionar teste do fluxo loja→checkout |

## Nota de arquitetura importante — carrinho

O prompt mestre pede carrinho com múltiplos produtos diferentes antes de ir ao checkout. **O banco atual não suporta isso ainda**: `orders.offer_id` é obrigatório (uma oferta por pedido) e `supplier_orders` tem `unique(order_id)` (um fornecedor por pedido). Isso foi desenhado de propósito para o modelo "uma landing page = um produto = um checkout direto" (o padrão usado na landing real `cinta-catraca-lp`).

Decisão tomada nesta sessão: construir a loja com o padrão **"Comprar agora"** (escolhe quantidade do mesmo produto, vai direto pro checkout existente) — 100% real e testável hoje, zero risco de schema. Carrinho com produtos diferentes juntos num pedido fica registrado como **próxima tarefa de backend** (migration + lógica nova), não fingido na UI.

## O que foi preservado

Nome Fazzo, logotipo, paleta, todo o admin existente (menu, dashboard, pedidos, ofertas, produtos, ações pendentes, teste de produtos), toda a lógica de checkout/Appmax/fornecedores/financeiro, todos os 9 migrations e as RLS policies. Nada foi reescrito do zero.
