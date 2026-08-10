/** Sends a WhatsApp message to a phone number. Implementations should throw on failure —
 * the caller (NotificationDispatcherService) is responsible for catching it and recording
 * a `failed` Notification instead of letting it bubble up into the triggering use case. */
export abstract class WhatsAppNotifierPort {
  abstract send(to: string, message: string): Promise<void>;
}
