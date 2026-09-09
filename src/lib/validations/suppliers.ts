import { z } from 'zod';

export const supplierSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  platform: z.enum(['shopee', 'supplier_direct', 'manual', 'api', 'other']),
  status: z.string().max(50).default('active'),
  notes: z.string().max(2000).optional().nullable(),
});

export const supplierProductSchema = z.object({
  supplier_id: z.string().uuid(),
  product_id: z.string().uuid(),
  supplier_sku: z.string().max(120).optional().nullable(),
  supplier_url: z.string().url().optional().nullable(),
  supplier_cost: z.number().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
  priority: z.number().int().default(0),
});

export const landingPageSchema = z.object({
  name: z.string().min(2).max(200),
  url: z.string().url(),
  offer_id: z.string().uuid(),
  active: z.boolean().default(true),
  description: z.string().max(1000).optional().nullable(),
});

export const supplierOrderTrackingSchema = z.object({
  carrier: z.string().min(2).max(80),
  tracking_code: z.string().min(2).max(80),
  tracking_url: z.string().url().optional().nullable(),
  status: z.string().max(80).optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type LandingPageInput = z.infer<typeof landingPageSchema>;
