import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationDispatcherService } from '../services/notification-dispatcher.service';
import {
  APPOINTMENT_CANCELLED_EVENT,
  APPOINTMENT_CREATED_EVENT,
  AppointmentCancelledEvent,
  AppointmentCreatedEvent,
} from '../../../appointments/domain/events/appointment-events';

/** Reacts to appointment lifecycle events emitted by the appointments module — this is the
 * only coupling point between the two modules, and it's one-directional: appointments never
 * imports notifications, it just emits; this listener lives entirely on the notifications
 * side and depends on appointments only for the event payload types. */
@Injectable()
export class AppointmentEventsListener {
  constructor(private readonly dispatcher: NotificationDispatcherService) {}

  @OnEvent(APPOINTMENT_CREATED_EVENT)
  async handleAppointmentCreated(event: AppointmentCreatedEvent): Promise<void> {
    await this.dispatcher.dispatch({
      type: 'confirmation',
      establishmentId: event.establishmentId,
      appointmentId: event.appointmentId,
      clientId: event.clientId,
      startAt: event.startAt,
    });
  }

  @OnEvent(APPOINTMENT_CANCELLED_EVENT)
  async handleAppointmentCancelled(event: AppointmentCancelledEvent): Promise<void> {
    await this.dispatcher.dispatch({
      type: 'cancellation',
      establishmentId: event.establishmentId,
      appointmentId: event.appointmentId,
      clientId: event.clientId,
      startAt: event.startAt,
      cancellationReason: event.cancellationReason,
    });
  }
}
