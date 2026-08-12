export interface EmailContent {
  html: string;
  text: string;
}

/** Sends an e-mail. Implementations should throw on failure — the caller
 * (NotificationDispatcherService) is responsible for catching it and recording a `failed`
 * Notification instead of letting it bubble up into the triggering use case. */
export abstract class EmailNotifierPort {
  abstract send(to: string, subject: string, content: EmailContent): Promise<void>;
}
