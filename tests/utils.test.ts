import { describe, expect, it } from 'vitest';
import { formatCentsToBRL, toCents, generateOrderNumber } from '@/lib/utils';

describe('utils monetários', () => {
  it('converte reais para centavos sem erro de ponto flutuante', () => {
    expect(toCents(129.9)).toBe(12990);
    expect(toCents(19.99)).toBe(1999);
  });

  it('formata centavos como BRL', () => {
    expect(formatCentsToBRL(12990)).toContain('129,90');
  });
});

describe('generateOrderNumber', () => {
  it('gera números únicos e não sequenciais', () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^DB-/);
  });
});
