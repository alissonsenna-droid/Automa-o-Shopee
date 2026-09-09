import { z } from 'zod';

/**
 * Corpo aceito em POST /api/checkout/session.
 * O PREÇO NUNCA vem daqui — só o identificador da oferta. O backend sempre
 * consulta offers no banco para resolver preço/frete reais.
 */
export const createCheckoutSessionSchema = z.object({
  offer_id: z.string().uuid().optional(),
  offer_slug: z.string().min(1).optional(),
  quantity: z.number().int().min(1).max(20).default(1),
  utm_source: z.string().max(255).optional(),
  utm_medium: z.string().max(255).optional(),
  utm_campaign: z.string().max(255).optional(),
  utm_content: z.string().max(255).optional(),
  utm_term: z.string().max(255).optional(),
  fbclid: z.string().max(255).optional(),
  gclid: z.string().max(255).optional(),
  ttclid: z.string().max(255).optional(),
  referrer: z.string().max(2048).optional(),
  landing_page_url: z.string().max(2048).optional(),
}).refine((data) => data.offer_id || data.offer_slug, {
  message: 'Informe offer_id ou offer_slug.',
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;

const cpfRegex = /^\d{11}$/;
const cepRegex = /^\d{8}$/;

export const submitCheckoutSchema = z.object({
  session_id: z.string().uuid(),
  idempotency_key: z.string().min(8).max(128),
  customer: z.object({
    name: z.string().min(3).max(160),
    cpf: z.string().transform((v) => v.replace(/\D/g, '')).pipe(z.string().regex(cpfRegex, 'CPF inválido')),
    phone: z.string().min(10).max(20),
    email: z.string().email(),
  }),
  address: z.object({
    cep: z.string().transform((v) => v.replace(/\D/g, '')).pipe(z.string().regex(cepRegex, 'CEP inválido')),
    state: z.string().length(2),
    city: z.string().min(2).max(120),
    street: z.string().min(2).max(200),
    number: z.string().min(1).max(20),
    complement: z.string().max(120).optional(),
    neighborhood: z.string().min(2).max(120),
  }),
  payment: z.discriminatedUnion('method', [
    z.object({ method: z.literal('pix') }),
    z.object({
      method: z.literal('credit_card'),
      card_token: z.string().min(10),
      installments: z.number().int().min(1).max(12).default(1),
    }),
  ]),
});

export type SubmitCheckoutInput = z.infer<typeof submitCheckoutSchema>;
