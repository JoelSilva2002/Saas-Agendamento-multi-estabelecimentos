import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { EmailNotifierPort } from '../../domain/email-notifier.port';
import {
  MAX_NOTIFICATION_ATTEMPTS,
  Notification,
  NotificationType,
} from '../../domain/entities/notification.entity';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { Establishment } from '../../../establishments/domain/entities/establishment.entity';
import { ServiceRepositoryPort } from '../../../services/domain/service.repository.port';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { AppConfig } from '../../../../config/configuration';
import { buildNotificationEmail } from './notification-email.template';

export interface DispatchNotificationInput {
  type: NotificationType;
  establishmentId: string;
  appointmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  startAt: Date;
  /** Required (and only used) for `cancellation`. */
  cancellationReason?: string;
  /** Required (and only used) for `reschedule` — where the appointment used to be. */
  previousStartAt?: Date;
}

const SUBJECTS: Record<NotificationType, string> = {
  confirmation: 'Confirmação de agendamento',
  reminder_24h: 'Lembrete de agendamento',
  reminder_2h: 'Lembrete de agendamento',
  cancellation: 'Cancelamento de agendamento',
  reschedule: 'Agendamento remarcado',
};

/** Backoff before each retry, indexed by (attempts-about-to-become - 1): 5min after the 1st
 * failure, 30min after the 2nd, 2h after the 3rd. The 4th failure (MAX_NOTIFICATION_ATTEMPTS)
 * has no entry — that's the point at which a row is left permanently `failed`. */
const RETRY_BACKOFF_MINUTES = [5, 30, 120];

function computeNextAttempt(currentAttempts: number): Date | null {
  const nextAttempts = currentAttempts + 1;
  if (nextAttempts >= MAX_NOTIFICATION_ATTEMPTS) {
    return null;
  }
  return new Date(Date.now() + RETRY_BACKOFF_MINUTES[nextAttempts - 1] * 60_000);
}

/** Unlike every other type, a reschedule can legitimately happen more than once for the same
 * appointment, so its idempotency token is the new start time rather than a constant. */
function dedupeKeyFor(input: DispatchNotificationInput): string {
  return input.type === 'reschedule' ? input.startAt.toISOString() : '';
}

/**
 * Central place that turns "something happened to an appointment" into zero or one outbound
 * e-mail (WhatsApp was removed — email is the only channel for now). Used both synchronously
 * (event listeners for confirmation/cancellation) and from the reminders cron. Never throws —
 * a send failure is recorded as a `failed` Notification row and logged, never propagated to
 * the caller, since a notification problem must never affect booking/cancellation or block the
 * next cron tick.
 *
 * A send that fails is not necessarily final: `retry()` — driven by a separate sweep cron —
 * re-attempts `failed` rows within their backoff/attempt budget, re-resolving the recipient
 * address each time since it isn't stored on the row itself.
 */
@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly emailNotifier: EmailNotifierPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async dispatch(input: DispatchNotificationInput): Promise<void> {
    try {
      const client = await this.userRepository.findById(input.clientId);
      if (!client) {
        this.logger.warn(
          `Cliente '${input.clientId}' não encontrado — notificação '${input.type}' ignorada`,
        );
        return;
      }
      if (!client.email) {
        // A walk-in client (see User.createWalkIn) has no email — not an error, just nothing
        // to send to. No Notification row is created, so the retry sweep never wastes an
        // attempt budget on something that can never succeed.
        this.logger.debug(
          `Cliente '${input.clientId}' sem e-mail cadastrado — notificação '${input.type}' pulada`,
        );
        return;
      }

      const establishment = await this.establishmentRepository.findByIdUnscoped(
        input.establishmentId,
      );
      if (!establishment) {
        this.logger.warn(
          `Estabelecimento '${input.establishmentId}' não encontrado — notificação '${input.type}' ignorada`,
        );
        return;
      }
      if (!establishment.notifyEmailEnabled) {
        return;
      }

      // Times in the message must read as they do on a clock at the establishment.
      const message = this.buildMessage(input, establishment.timezone);
      const html = await this.buildEmailHtml(input, establishment, message);
      await this.dispatchEmail(input, client.email, message, html);
    } catch (error) {
      this.logger.error(
        `Falha inesperada ao despachar notificação '${input.type}' para o agendamento '${input.appointmentId}'`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Re-attempts a `failed` row that's still within its retry budget. Called by the retry
   * sweep use-case, never by the dispatch-triggering listeners/cron directly — those only
   * ever create a row once per (appointmentId, type, dedupeKey); this is the only path that
   * acts on an existing failed one.
   */
  async retry(notification: Notification): Promise<void> {
    const to = await this.resolveRecipientAddress(notification);
    if (!to) {
      this.logger.warn(
        `Não foi possível resolver o destinatário da notificação '${notification.id}' — desistindo`,
      );
      await this.notificationRepository.update(
        notification.markFailed('destinatário não encontrado', null),
      );
      return;
    }
    await this.attemptSend(notification, to);
  }

  /** Resolves service/employee names and renders the branded HTML e-mail. */
  private async buildEmailHtml(
    input: DispatchNotificationInput,
    establishment: Establishment,
    message: string,
  ): Promise<string> {
    const [service, employee] = await Promise.all([
      this.serviceRepository.findById(input.serviceId, input.establishmentId),
      this.employeeRepository.findById(input.employeeId, input.establishmentId),
    ]);

    let employeeName: string | null = null;
    if (employee) {
      const employeeUser = await this.userRepository.findById(employee.userId);
      employeeName = employeeUser ? `${employeeUser.firstName} ${employeeUser.lastName}` : null;
    }

    const frontendUrl = this.configService.get('frontendUrl', { infer: true });
    const { html } = buildNotificationEmail({
      establishmentName: establishment.name,
      establishmentAddress: establishment.address,
      serviceName: service?.name ?? null,
      employeeName,
      message,
      manageUrl: `${frontendUrl}/meus-agendamentos`,
    });
    return html;
  }

  private async resolveRecipientAddress(notification: Notification): Promise<string | null> {
    const client = await this.userRepository.findById(notification.recipientUserId);
    return client?.email ?? null;
  }

  private async dispatchEmail(
    input: DispatchNotificationInput,
    to: string,
    message: string,
    htmlBody: string,
  ): Promise<void> {
    const dedupeKey = dedupeKeyFor(input);
    // Any existing row (regardless of status) means this exact key has already been tried on
    // the trigger side — only the retry sweep may act on it again from here on.
    const existing = await this.notificationRepository.findExisting(
      input.appointmentId,
      input.type,
      'email',
      dedupeKey,
    );
    if (existing) {
      return;
    }

    let notification = Notification.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      appointmentId: input.appointmentId,
      recipientUserId: input.clientId,
      channel: 'email',
      type: input.type,
      message,
      htmlBody,
      dedupeKey,
    });
    notification = await this.notificationRepository.create(notification);

    await this.attemptSend(notification, to);
  }

  private async attemptSend(notification: Notification, to: string): Promise<void> {
    try {
      // htmlBody is only ever null for pre-existing rows created before this field existed —
      // fall back to a plain wrap so a retry on one of those doesn't crash.
      const html = notification.htmlBody ?? `<p>${notification.message}</p>`;
      await this.emailNotifier.send(to, SUBJECTS[notification.type], {
        html,
        text: notification.message,
      });
      await this.notificationRepository.update(notification.markSent());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha ao enviar notificação '${notification.type}' para '${to}' (tentativa ${notification.attempts + 1}): ${errorMessage}`,
      );
      const nextAttemptAt = computeNextAttempt(notification.attempts);
      await this.notificationRepository.update(notification.markFailed(errorMessage, nextAttemptAt));
    }
  }

  private buildMessage(input: DispatchNotificationInput, timeZone: string): string {
    const when = this.formatDateTime(input.startAt, timeZone);
    switch (input.type) {
      case 'confirmation':
        return `Seu agendamento para ${when} foi confirmado.`;
      case 'reminder_24h':
        return `Lembrete: você tem um agendamento amanhã, ${when}.`;
      case 'reminder_2h':
        return `Lembrete: seu agendamento é hoje, ${when} (em cerca de 2 horas).`;
      case 'cancellation':
        return `Seu agendamento de ${when} foi cancelado. Motivo: ${input.cancellationReason ?? 'não informado'}.`;
      case 'reschedule':
        return input.previousStartAt
          ? `Seu agendamento foi remarcado de ${this.formatDateTime(input.previousStartAt, timeZone)} para ${when}.`
          : `Seu agendamento foi remarcado para ${when}.`;
    }
  }

  /**
   * Reads the instant on a clock at the establishment, not in UTC.
   *
   * Getting this wrong is not cosmetic: a client in São Paulo told "às 18:00" for an
   * appointment that is actually at 15:00 would simply miss it.
   */
  private formatDateTime(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';

    return `${get('day')}/${get('month')}/${get('year')} às ${get('hour')}:${get('minute')}`;
  }
}
