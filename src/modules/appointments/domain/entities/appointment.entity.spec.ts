import { Appointment } from './appointment.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';
import {
  CancellationReasonRequiredError,
  InvalidAppointmentStatusTransitionError,
} from '../errors/appointment-errors';

function buildAppointment(): Appointment {
  return Appointment.create({
    id: 'appointment-1',
    establishmentId: 'establishment-1',
    clientId: 'client-1',
    employeeId: 'employee-1',
    serviceId: 'service-1',
    startAt: new Date('2026-03-10T10:00:00.000Z'),
    endAt: new Date('2026-03-10T10:30:00.000Z'),
    priceCents: 5000,
    createdById: 'staff-1',
  });
}

describe('Appointment', () => {
  describe('cancel', () => {
    it('cancels a pending appointment with a reason', () => {
      const appointment = buildAppointment();
      const cancelled = appointment.cancel('Cliente desmarcou', 'client-1');

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellationReason).toBe('Cliente desmarcou');
      expect(cancelled.cancelledById).toBe('client-1');
      expect(cancelled.cancelledAt).toBeInstanceOf(Date);
      // original instance is untouched (immutable pattern)
      expect(appointment.status).toBe('pending');
    });

    it('rejects an empty reason', () => {
      const appointment = buildAppointment();
      expect(() => appointment.cancel('   ', 'client-1')).toThrow(CancellationReasonRequiredError);
    });

    it('rejects cancelling an already-terminal appointment', () => {
      const appointment = buildAppointment();
      const cancelled = appointment.cancel('Motivo', 'client-1');
      expect(() => cancelled.cancel('Outro motivo', 'client-1')).toThrow(
        InvalidAppointmentStatusTransitionError,
      );
    });
  });

  describe('reschedule', () => {
    it('updates startAt/endAt and optionally the employee', () => {
      const appointment = buildAppointment();
      const rescheduled = appointment.reschedule(
        new Date('2026-03-11T14:00:00.000Z'),
        new Date('2026-03-11T14:30:00.000Z'),
        'employee-2',
      );

      expect(rescheduled.startAt).toEqual(new Date('2026-03-11T14:00:00.000Z'));
      expect(rescheduled.endAt).toEqual(new Date('2026-03-11T14:30:00.000Z'));
      expect(rescheduled.employeeId).toBe('employee-2');
      expect(appointment.startAt).toEqual(new Date('2026-03-10T10:00:00.000Z'));
    });

    it('keeps the same employee when none is passed', () => {
      const appointment = buildAppointment();
      const rescheduled = appointment.reschedule(
        new Date('2026-03-11T14:00:00.000Z'),
        new Date('2026-03-11T14:30:00.000Z'),
      );
      expect(rescheduled.employeeId).toBe('employee-1');
    });

    it('rejects an invalid range', () => {
      const appointment = buildAppointment();
      expect(() =>
        appointment.reschedule(
          new Date('2026-03-11T14:30:00.000Z'),
          new Date('2026-03-11T14:00:00.000Z'),
        ),
      ).toThrow(ValidationError);
    });

    it('rejects rescheduling a terminal appointment', () => {
      const appointment = buildAppointment();
      const cancelled = appointment.cancel('Motivo', 'client-1');
      expect(() =>
        cancelled.reschedule(
          new Date('2026-03-11T14:00:00.000Z'),
          new Date('2026-03-11T14:30:00.000Z'),
        ),
      ).toThrow(InvalidAppointmentStatusTransitionError);
    });
  });

  describe('markNoShow', () => {
    it('sets status to no_show with the given fee snapshot', () => {
      const appointment = buildAppointment();
      const noShow = appointment.markNoShow(2500);
      expect(noShow.status).toBe('no_show');
      expect(noShow.noShowFeeCents).toBe(2500);
    });

    it('allows a null fee when the establishment has no-show fees disabled', () => {
      const appointment = buildAppointment();
      const noShow = appointment.markNoShow(null);
      expect(noShow.noShowFeeCents).toBeNull();
    });

    it('rejects marking a terminal appointment as no-show', () => {
      const appointment = buildAppointment();
      const completed = appointment.cancel('Motivo', 'client-1');
      expect(() => completed.markNoShow(null)).toThrow(InvalidAppointmentStatusTransitionError);
    });
  });

  describe('checkIn', () => {
    it('transitions pending to in_progress', () => {
      const appointment = buildAppointment();
      expect(appointment.checkIn().status).toBe('in_progress');
    });

    it('rejects check-in on an appointment already in progress or further along', () => {
      const inProgress = buildAppointment().checkIn();
      expect(() => inProgress.checkIn()).toThrow(InvalidAppointmentStatusTransitionError);

      const cancelled = buildAppointment().cancel('Motivo', 'client-1');
      expect(() => cancelled.checkIn()).toThrow(InvalidAppointmentStatusTransitionError);
    });
  });

  describe('complete', () => {
    it('transitions to completed', () => {
      const appointment = buildAppointment();
      expect(appointment.complete().status).toBe('completed');
    });

    it('rejects completing an already-terminal appointment', () => {
      const cancelled = buildAppointment().cancel('Motivo', 'client-1');
      expect(() => cancelled.complete()).toThrow(InvalidAppointmentStatusTransitionError);
    });
  });
});
