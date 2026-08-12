import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WaitlistEntryRepositoryPort } from '../../domain/waitlist-entry.repository.port';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity';
import { periodForHour, periodMatches } from '../../domain/services/waitlist-period.util';
import { WhatsAppNotifierPort } from '../../../notifications/domain/whatsapp-notifier.port';
import { EmailNotifierPort } from '../../../notifications/domain/email-notifier.port';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { ClientProfileRepositoryPort } from '../../../clients/domain/client-profile.repository.port';
import {
  APPOINTMENT_CANCELLED_EVENT,
  AppointmentCancelledEvent,
} from '../../../appointments/domain/events/appointment-events';

const MESSAGE =
  'Boas notícias! Um horário que combina com o que você pediu na lista de espera acabou de abrir. Reserve rápido antes que outra pessoa pegue.';

/**
 * Best-effort matcher: doesn't re-check real availability (that's what the normal booking
 * flow already does when the client tries to reserve) — just tells waiting clients "something
 * like what you wanted opened up". Never blocks or fails the cancellation itself; this
 * listener runs after CancelAppointmentUseCase's own emitAsync already resolved successfully
 * for the notifications listener, and any error here is caught and logged only.
 */
@Injectable()
export class AppointmentCancelledListener {
  private readonly logger = new Logger(AppointmentCancelledListener.name);

  constructor(
    private readonly waitlistEntryRepository: WaitlistEntryRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly clientProfileRepository: ClientProfileRepositoryPort,
    private readonly whatsAppNotifier: WhatsAppNotifierPort,
    private readonly emailNotifier: EmailNotifierPort,
  ) {}

  @OnEvent(APPOINTMENT_CANCELLED_EVENT)
  async handleAppointmentCancelled(event: AppointmentCancelledEvent): Promise<void> {
    try {
      const matches = await this.waitlistEntryRepository.findWaitingMatches(
        event.establishmentId,
        event.serviceId,
        event.employeeId,
        event.startAt,
      );

      const actualPeriod = periodForHour(event.startAt);
      const dueMatches = matches.filter((entry) =>
        periodMatches(entry.desiredPeriod, actualPeriod),
      );

      for (const entry of dueMatches) {
        await this.notifyEntry(entry);
      }
    } catch (error) {
      this.logger.error(
        `Falha ao processar a lista de espera para o agendamento cancelado '${event.appointmentId}'`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async notifyEntry(entry: WaitlistEntry): Promise<void> {
    try {
      const client = await this.userRepository.findById(entry.clientId);
      if (!client) {
        return;
      }
      const clientProfile = await this.clientProfileRepository.findByUserAndEstablishment(
        entry.clientId,
        entry.establishmentId,
      );

      await this.emailNotifier.send(client.email, 'Vaga disponível na lista de espera', {
        html: `<p>${MESSAGE}</p>`,
        text: MESSAGE,
      });
      if (clientProfile?.phone) {
        await this.whatsAppNotifier.send(clientProfile.phone, MESSAGE);
      }

      await this.waitlistEntryRepository.update(entry.markNotified());
    } catch (error) {
      this.logger.error(
        `Falha ao notificar a entrada '${entry.id}' da lista de espera`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
