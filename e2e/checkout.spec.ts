import { test, expect } from '@playwright/test';

/**
 * Cria uma sessão de checkout e um pedido REAL (não existe sandbox da
 * Appmax) e verifica se o Pix é gerado de ponta a ponta. Por isso fica
 * fora da suíte padrão — só roda com RUN_LIVE_CHECKOUT_TEST=1, e quem
 * rodar deve depois deixar a ordem expirar (como já é feito hoje) ou
 * cancelar pelo admin. Não envolve cartão real nem cobrança de cartão.
 */
test.skip(!process.env.RUN_LIVE_CHECKOUT_TEST, 'Cria pedido real — rode só manualmente com RUN_LIVE_CHECKOUT_TEST=1');

test('fluxo completo home → produto → checkout → Pix real', async ({ page }) => {
  await page.goto('/');
  await page.locator('a[href^="/produto/"]').first().click();
  await page.waitForURL(/\/produto\//);
  await page.getByRole('button', { name: /Comprar agora/i }).click();
  await page.waitForURL(/\/checkout\//, { timeout: 15000 });

  await page.getByLabel(/nome/i).first().fill('Teste E2E Playwright');
  await page.getByLabel(/cpf/i).fill('11144477735');
  await page.getByLabel(/telefone|celular/i).fill('11999998888');
  await page.getByLabel(/e-?mail/i).fill(`teste.e2e.${Date.now()}@fazzo.test`);
  await page.getByLabel(/cep/i).fill('01310100');
  await page.waitForTimeout(1000); // auto-preenchimento de endereço via CEP

  await page.getByRole('button', { name: /gerar pix|finalizar|pagar/i }).click();

  await expect(page.locator('text=/copia e cola|qr ?code/i')).toBeVisible({ timeout: 20000 });
});
