import { z } from 'zod';

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'supplier_pending',
  'supplier_ordered',
  'supplier_shipped',
  'in_transit',
  'delivered',
  'cancelled',
  'refunded',
  'problem',
] as const;

/** Atualização manual de um pedido pelo admin — hoje usada pra cancelar, marcar reembolso e anotar. */
export const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
