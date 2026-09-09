import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  sku: z.string().max(80).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  price: z.number().nonnegative(),
  compare_price: z.number().nonnegative().optional().nullable(),
  cost_price: z.number().nonnegative(),
  images: z.array(z.string().url()).default([]),
  active: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
});

export const updateProductSchema = productSchema.partial();

export type ProductInput = z.infer<typeof productSchema>;
