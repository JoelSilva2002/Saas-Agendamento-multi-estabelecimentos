import { Appointment } from '../../domain/entities/appointment.entity';

const HEADERS = [
  'id',
  'startAt',
  'endAt',
  'status',
  'employeeId',
  'serviceId',
  'clientId',
  'priceCents',
];

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Excel/Sheets open CSV natively — no binary-format library needed for the "Excel" export. */
export class CsvAppointmentFormatter {
  static format(appointments: Appointment[]): string {
    const rows = appointments.map((appointment) =>
      [
        appointment.id,
        appointment.startAt.toISOString(),
        appointment.endAt.toISOString(),
        appointment.status,
        appointment.employeeId,
        appointment.serviceId,
        appointment.clientId,
        String(appointment.priceCents),
      ]
        .map(escapeCsvField)
        .join(','),
    );
    return [HEADERS.join(','), ...rows].join('\n');
  }
}
