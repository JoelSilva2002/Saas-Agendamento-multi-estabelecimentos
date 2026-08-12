export const APPOINTMENT_CREATED_EVENT = 'appointment.created';
export const APPOINTMENT_CANCELLED_EVENT = 'appointment.cancelled';
export const APPOINTMENT_RESCHEDULED_EVENT = 'appointment.rescheduled';

/** Payload carries only facts owned by the appointments domain — recipient contact info
 * (email/phone) is looked up by whoever listens, not embedded here, so this module never
 * needs to know about users/clients. */
export interface AppointmentCreatedEvent {
  appointmentId: string;
  establishmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  priceCents: number;
}

export interface AppointmentRescheduledEvent {
  appointmentId: string;
  establishmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  /** Where the appointment moved to — what the client needs to be told. */
  startAt: Date;
  endAt: Date;
  /** Where it was before, so a listener can say "no lugar de ...". */
  previousStartAt: Date;
}

export interface AppointmentCancelledEvent {
  appointmentId: string;
  establishmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  startAt: Date;
  cancellationReason: string;
  cancelledById: string;
}
