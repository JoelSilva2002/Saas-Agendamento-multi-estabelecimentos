export const APPOINTMENT_CREATED_EVENT = 'appointment.created';
export const APPOINTMENT_CANCELLED_EVENT = 'appointment.cancelled';

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

export interface AppointmentCancelledEvent {
  appointmentId: string;
  establishmentId: string;
  clientId: string;
  startAt: Date;
  cancellationReason: string;
  cancelledById: string;
}
