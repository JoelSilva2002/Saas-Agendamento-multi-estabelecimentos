import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { DateRangeInput } from './get-top-services.use-case';

export interface ClientMetric {
  clientId: string;
  /** Appointments actually honoured — the "frequência" of §12. */
  count: number;
  /** What the client has actually spent, from the price snapshot on each appointment. */
  revenueCents: number;
  lastVisitAt: Date;
}

/** "Clientes que mais agendam" (§11). Counts completed visits only: a cancellation or a
 * no-show is not a sign of a good customer, and counting them would rank the least reliable
 * clients highest. */
@Injectable()
export class GetTopClientsUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepositoryPort) {}

  async execute(input: DateRangeInput): Promise<ClientMetric[]> {
    const appointments = await this.appointmentRepository.findMany(input.establishmentId, {
      fromDate: input.fromDate,
      toDate: input.toDate,
    });

    const byClient = new Map<string, ClientMetric>();
    for (const appointment of appointments) {
      if (appointment.status !== 'completed') {
        continue;
      }
      const existing = byClient.get(appointment.clientId) ?? {
        clientId: appointment.clientId,
        count: 0,
        revenueCents: 0,
        lastVisitAt: appointment.startAt,
      };
      existing.count += 1;
      existing.revenueCents += appointment.priceCents;
      if (appointment.startAt > existing.lastVisitAt) {
        existing.lastVisitAt = appointment.startAt;
      }
      byClient.set(appointment.clientId, existing);
    }

    return [...byClient.values()].sort((a, b) => b.count - a.count || b.revenueCents - a.revenueCents);
  }
}
