export type NotificationEvent =
  | 'payment_approved'
  | 'order_shipped'
  | 'tracking_available'
  | 'order_delivered';

export interface NotificationPayload {
  event: NotificationEvent;
  to: { email?: string; phone?: string };
  data: Record<string, unknown>;
}

export interface NotificationProvider {
  readonly channel: 'email' | 'whatsapp' | 'sms';
  send(payload: NotificationPayload): Promise<void>;
}
