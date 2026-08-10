import { CreateReviewUseCase } from './create-review.use-case';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { ReviewRepositoryPort } from '../../domain/review.repository.port';
import { Appointment } from '../../../appointments/domain/entities/appointment.entity';
import { Review } from '../../domain/entities/review.entity';
import {
  AppointmentNotReviewableError,
  ReviewAccessDeniedError,
} from '../../domain/errors/review-errors';
import { AppointmentNotFoundError } from '../../../appointments/domain/errors/appointment-errors';

describe('CreateReviewUseCase', () => {
  function buildAppointment(status: Appointment['status'], clientId = 'client-1'): Appointment {
    const appointment = Appointment.create({
      id: 'appointment-1',
      establishmentId: 'establishment-1',
      clientId,
      employeeId: 'employee-1',
      serviceId: 'service-1',
      startAt: new Date('2026-03-10T10:00:00.000Z'),
      endAt: new Date('2026-03-10T10:30:00.000Z'),
      priceCents: 5000,
      createdById: 'staff-1',
    });
    return status === 'completed' ? appointment.complete() : appointment;
  }

  function build(overrides?: {
    appointmentRepository?: Partial<AppointmentRepositoryPort>;
    reviewRepository?: Partial<ReviewRepositoryPort>;
  }) {
    const appointmentRepository: AppointmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(buildAppointment('completed')),
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    const reviewRepository: ReviewRepositoryPort = {
      create: jest.fn().mockImplementation((r: Review) => Promise.resolve(r)),
      ...overrides?.reviewRepository,
    } as unknown as ReviewRepositoryPort;

    return {
      useCase: new CreateReviewUseCase(appointmentRepository, reviewRepository),
      reviewRepository,
    };
  }

  const baseInput = {
    establishmentId: 'establishment-1',
    appointmentId: 'appointment-1',
    clientId: 'client-1',
    rating: 5,
  };

  it('creates a review for a completed appointment owned by the client', async () => {
    const { useCase, reviewRepository } = build();
    const review = await useCase.execute(baseInput);
    expect(review.rating).toBe(5);
    expect(reviewRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'employee-1' }),
    );
  });

  it('throws AppointmentNotReviewableError when the appointment is not completed', async () => {
    const { useCase } = build({
      appointmentRepository: { findById: jest.fn().mockResolvedValue(buildAppointment('pending')) },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(AppointmentNotReviewableError);
  });

  it('throws ReviewAccessDeniedError when the appointment belongs to another client', async () => {
    const { useCase } = build({
      appointmentRepository: {
        findById: jest.fn().mockResolvedValue(buildAppointment('completed', 'other-client')),
      },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(ReviewAccessDeniedError);
  });

  it('throws AppointmentNotFoundError when missing', async () => {
    const { useCase } = build({
      appointmentRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(AppointmentNotFoundError);
  });
});
