import { defineConfig, devices } from '@playwright/test';

/**
 * Roda contra o site publicado real (PLAYWRIGHT_BASE_URL ou produção por
 * padrão) — não existe ambiente de staging/sandbox da Appmax, então "e2e"
 * aqui sempre significa produção de verdade. Testes que criam pedidos reais
 * ficam isolados em e2e/checkout.spec.ts, guardados por RUN_LIVE_CHECKOUT_TEST.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://automa-o-shopee.vercel.app',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: '/opt/pw-browsers/chromium',
        },
      },
    },
  ],
});
