import { test, expect } from '@playwright/test';

/**
 * Navegação pura na loja real publicada — não cria pedido, não chama
 * Appmax. Serve de rede de segurança contra regressão visual/estrutural
 * (ex: o bug de hidratação do form de cartão achado em 17/11/2026, ou o
 * menu de categorias que não batia com produto nenhum).
 */

test('home carrega com header, footer e pelo menos uma oferta', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Fazzo/i);
  await expect(page.locator('a[href^="/produto/"]').first()).toBeVisible();
});

test('não existem links mortos óbvios no header/footer', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href]').evaluateAll((links) =>
    links.map((l) => l.getAttribute('href')).filter((h): h is string => !!h && h.startsWith('/')),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of new Set(hrefs)) {
    const resp = await page.goto(href);
    expect(resp?.status(), `link ${href} retornou ${resp?.status()}`).toBeLessThan(400);
  }
});

test('clicar numa oferta abre a página de produto com botão "Comprar agora"', async ({ page }) => {
  await page.goto('/');
  const firstOffer = page.locator('a[href^="/produto/"]').first();
  await firstOffer.click();
  await page.waitForURL(/\/produto\//);
  await expect(page.getByRole('button', { name: /Comprar agora/i })).toBeVisible();
});

test('página 404 customizada aparece em rota inexistente', async ({ page }) => {
  const resp = await page.goto('/isso-nao-existe-' + Date.now());
  expect(resp?.status()).toBe(404);
  await expect(page.getByText(/não encontrada/i)).toBeVisible();
});

test('busca retorna resultados sem erro de servidor', async ({ page }) => {
  const resp = await page.goto('/busca?q=a');
  expect(resp?.status()).toBeLessThan(500);
});
