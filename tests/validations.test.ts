import { describe, expect, it } from 'vitest';
import { createCheckoutSessionSchema, submitCheckoutSchema } from '@/lib/validations/checkout';
import { duplicateOfferSchema } from '@/lib/validations/offers';

describe('createCheckoutSessionSchema', () => {
  it('exige offer_id ou offer_slug', () => {
    const result = createCheckoutSessionSchema.safeParse({ quantity: 1 });
    expect(result.success).toBe(false);
  });

  it('aceita offer_slug sozinho', () => {
    const result = createCheckoutSessionSchema.safeParse({ offer_slug: 'tenis-preto-v1' });
    expect(result.success).toBe(true);
  });
});

describe('submitCheckoutSchema', () => {
  const base = {
    session_id: '123e4567-e89b-12d3-a456-426614174000',
    idempotency_key: 'abcdefgh12345678',
    customer: { name: 'Fulano de Tal', cpf: '123.456.789-00', phone: '11999998888', email: 'a@b.com' },
    address: { cep: '01310-100', state: 'SP', city: 'São Paulo', street: 'Av. Paulista', number: '1000', neighborhood: 'Bela Vista' },
  };

  it('valida um pagamento pix', () => {
    const result = submitCheckoutSchema.safeParse({ ...base, payment: { method: 'pix' } });
    expect(result.success).toBe(true);
  });

  it('normaliza CPF e CEP removendo pontuação', () => {
    const result = submitCheckoutSchema.parse({ ...base, payment: { method: 'pix' } });
    expect(result.customer.cpf).toBe('12345678900');
    expect(result.address.cep).toBe('01310100');
  });

  it('rejeita cartão sem card_token', () => {
    const result = submitCheckoutSchema.safeParse({ ...base, payment: { method: 'credit_card' } });
    expect(result.success).toBe(false);
  });
});

describe('duplicateOfferSchema', () => {
  it('exige nome e slug válidos', () => {
    expect(duplicateOfferSchema.safeParse({ name: 'X', slug: 'Slug Invalido' }).success).toBe(false);
    expect(duplicateOfferSchema.safeParse({ name: 'X', slug: 'slug-valido' }).success).toBe(true);
  });
});
