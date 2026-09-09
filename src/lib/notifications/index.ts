import type { NotificationPayload } from './types';
import { NoopNotificationProvider } from './noop-provider';

export * from './types';
export * from './noop-provider';

// Troque por implementações reais (Resend, WhatsApp Cloud API, Twilio, etc.)
// quando desejar. Continua desligado por padrão via NOTIFICATIONS_ENABLED.
const providers = {
  email: new NoopNotificationProvider('email'),
  whatsapp: new NoopNotificationProvider('whatsapp'),
  sms: new NoopNotificationProvider('sms'),
};

export async function notify(channel: keyof typeof providers, payload: NotificationPayload): Promise<void> {
  if (process.env.NOTIFICATIONS_ENABLED !== 'true') {
    console.log(`[notifications] desabilitado (NOTIFICATIONS_ENABLED=false) — evento ignorado: ${payload.event}`);
    return;
  }
  await providers[channel].send(payload);
}
