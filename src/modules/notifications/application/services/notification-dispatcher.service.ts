import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { WhatsAppNotifierPort } from '../../domain/whatsapp-notifier.port';
import { EmailNotifierPort } from '../../domain/email-notifier.port';
import {
  Notification,
  NotificationChannel,
  NotificationType,
} from '../../domain/entities/notification.entity';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { ClientProfileRepositoryPort } from '../../../clients/domain/client-profile.repository.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';

export interface DispatchNotificationInput {
  type: NotificationType;
  establishmentId: string;
  appointmentId: string;
  clientId: string;
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

/** Unlike every other type, a reschedule can legitimately happen more than once for the same
 * appointment, so its idempotency token is the new start time rather than a constant. */
function dedupeKeyFor(input: DispatchNotificationInput): string {
  return input.type === 'reschedule' ? input.startAt.toISOString() : '';
}

/**
 * Central place that turns "something happened to an appointment" into zero or more
 * outbound messages. Used both synchronously (event listeners for confirmation/cancellation)
 * and from the reminders cron. Never throws — a channel failure is recorded as a `failed`
 * Notification row and logged, never propagated to the caller, since a notification problem
 * must never affect booking/cancellation or block the next cron tick.
 */
@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly clientProfileRepository: ClientProfileRepositoryPort,
    private readonly whatsAppNotifier: WhatsAppNotifierPort,
    private readonly emailNotifier: EmailNotifierPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
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

      const clientProfile = await this.clientProfileRepository.findByUserAndEstablishment(
        input.clientId,
        input.establishmentId,
      );

      // Times in the message must read as they do on a clock at the establishment.
      const timeZone =
        (await this.establishmentRepository.getTimeZone(input.establishmentId)) ?? 'UTC';
      const message = this.buildMessage(input, timeZone);

      await this.dispatchChannel(input, 'email', client.email, message);
      if (clientProfile?.phone) {
        await this.dispatchChannel(input, 'whatsapp', clientProfile.phone, message);
      }
    } catch (error) {
      this.logger.error(
        `Falha inesperada ao despachar notificação '${input.type}' para o agendamento '${input.appointmentId}'`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async dispatchChannel(
    input: DispatchNotificationInput,
    channel: NotificationChannel,
    to: string,
    message: string,
  ): Promise<void> {
    const dedupeKey = dedupeKeyFor(input);
    const alreadySent = await this.notificationRepository.existsForAppointment(
      input.appointmentId,
      input.type,
      channel,
      dedupeKey,
    );
    if (alreadySent) {
      return;
    }

    let notification = Notification.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      appointmentId: input.appointmentId,
      recipientUserId: input.clientId,
      channel,
      type: input.type,
      message,
      dedupeKey,
    });
    notification = await this.notificationRepository.create(notification);

    try {
      if (channel === 'whatsapp') {
        await this.whatsAppNotifier.send(to, message);
      } else {
        await this.emailNotifier.send(to, SUBJECTS[input.type], message);
      }
      await this.notificationRepository.update(notification.markSent());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha ao enviar notificação '${input.type}' por ${channel} para '${to}': ${errorMessage}`,
      );
      await this.notificationRepository.update(notification.markFailed(errorMessage));
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
