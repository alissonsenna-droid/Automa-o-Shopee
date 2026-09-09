import type { NotificationPayload, NotificationProvider } from './types';

/** Provider padrão: apenas loga, não envia nada de verdade. */
export class NoopNotificationProvider implements NotificationProvider {
  constructor(public readonly channel: 'email' | 'whatsapp' | 'sms') {}

  async send(payload: NotificationPayload): Promise<void> {
    console.log(`[notifications:${this.channel}] (noop)`, payload.event, payload.to);
  }
}
