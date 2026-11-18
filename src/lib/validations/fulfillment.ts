import { z } from 'zod';

export const MARKETPLACES = ['mercado_livre', 'shopee', 'tiktok_shop', 'outro'] as const;

export const createFulfillmentOrderSchema = z.object({
  source: z.string().min(1).default('cartipanda'),
  external_order_id: z.string().trim().min(1).optional(),
  marketplace: z.enum(MARKETPLACES),
  product_description: z.string().trim().min(1, 'Descreva o que precisa comprar.'),
  product_url: z.string().trim().url().optional().or(z.literal('')),
  quantity: z.coerce.number().int().min(1).default(1),
  sale_price: z.coerce.number().min(0).default(0),
  customer_name: z.string().trim().min(1, 'Nome do cliente é obrigatório.'),
  customer_cpf: z.string().trim().optional(),
  customer_phone: z.string().trim().optional(),
  customer_email: z.string().trim().email().optional().or(z.literal('')),
  address_cep: z.string().trim().optional(),
  address_street: z.string().trim().optional(),
  address_number: z.string().trim().optional(),
  address_complement: z.string().trim().optional(),
  address_neighborhood: z.string().trim().optional(),
  address_city: z.string().trim().optional(),
  address_state: z.string().trim().max(2).optional(),
  notes: z.string().trim().optional(),
});

export const updateFulfillmentOrderSchema = z.object({
  status: z.enum(['pending', 'sent', 'confirmed', 'shipped', 'cancelled', 'problem']).optional(),
  supplier_cost: z.coerce.number().min(0).optional(),
  purchase_order_number: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
