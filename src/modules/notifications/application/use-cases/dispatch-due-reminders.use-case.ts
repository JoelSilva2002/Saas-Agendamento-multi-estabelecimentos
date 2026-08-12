import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { Establishment } from '../../../establishments/domain/entities/establishment.entity';
import { NotificationDispatcherService } from '../services/notification-dispatcher.service';
import { NotificationType } from '../../domain/entities/notification.entity';

const TERMINAL_APPOINTMENT_STATUSES = ['cancelled', 'no_show'];

interface ReminderWindow {
  type: Extract<NotificationType, 'reminder_24h' | 'reminder_2h'>;
  hoursBefore: number;
  isEnabled: (establishment: Establishment) => boolean;
}

const REMINDER_WINDOWS: ReminderWindow[] = [
  { type: 'reminder_24h', hoursBefore: 24, isEnabled: (e) => e.reminder24hEnabled },
  { type: 'reminder_2h', hoursBefore: 2, isEnabled: (e) => e.reminder2hEnabled },
];

// Half-width of the scan window around "now + hoursBefore" — must be at least as wide as
// the cron tick interval (5 min) so consecutive ticks don't leave a gap an appointment could
// fall through; dispatch is idempotent per (appointmentId, type, channel) regardless, so a
// wider window here only means "checked more than once", never "notified twice".
const WINDOW_HALF_WIDTH_MINUTES = 5;

@Injectable()
export class DispatchDueRemindersUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  async execute(establishment: Establishment, now: Date = new Date()): Promise<void> {
    const windows = REMINDER_WINDOWS.filter((window) => window.isEnabled(establishment));

    for (const window of windows) {
      const targetMs = now.getTime() + window.hoursBefore * 60 * 60_000;
      const fromDate = new Date(targetMs - WINDOW_HALF_WIDTH_MINUTES * 60_000);
      const toDate = new Date(targetMs + WINDOW_HALF_WIDTH_MINUTES * 60_000);

      const appointments = await this.appointmentRepository.findMany(establishment.id, {
        fromDate,
        toDate,
      });
      const dueAppointments = appointments.filter(
        (a) => !TERMINAL_APPOINTMENT_STATUSES.includes(a.status),
      );

      for (const appointment of dueAppointments) {
        await this.dispatcher.dispatch({
          type: window.type,
          establishmentId: appointment.establishmentId,
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          employeeId: appointment.employeeId,
          serviceId: appointment.serviceId,
          startAt: appointment.startAt,
        });
      }
    }
  }
}
