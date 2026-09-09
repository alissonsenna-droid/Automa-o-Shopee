import { z } from 'zod';

export const offerSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  product_id: z.string().uuid(),
  price: z.number().positive(),
  compare_price: z.number().nonnegative().optional().nullable(),
  shipping_price: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  active: z.boolean().default(true),
  landing_page_url: z.string().url().optional().nullable(),
  checkout_enabled: z.boolean().default(true),
  tracking_enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
});

export const updateOfferSchema = offerSchema.partial();

export const duplicateOfferSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
  price: z.number().positive().optional(),
  landing_page_url: z.string().url().optional().nullable(),
});

export type OfferInput = z.infer<typeof offerSchema>;
export type DuplicateOfferInput = z.infer<typeof duplicateOfferSchema>;
