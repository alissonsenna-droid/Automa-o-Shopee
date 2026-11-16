import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` só resolve para seu no-op (`empty.js`) sob a condição
      // "react-server" que o bundler do Next define em build. Sob vitest/Node
      // puro ele cai no `index.js`, que lança erro de propósito — aliasamos
      // direto pro no-op pra poder testar código server-only fora do Next.
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
  },
});
