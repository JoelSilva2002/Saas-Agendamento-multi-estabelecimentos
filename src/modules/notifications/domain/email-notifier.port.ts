/** Sends an e-mail. Same failure contract as WhatsAppNotifierPort — throw, don't swallow. */
export abstract class EmailNotifierPort {
  abstract send(to: string, subject: string, body: string): Promise<void>;
}
