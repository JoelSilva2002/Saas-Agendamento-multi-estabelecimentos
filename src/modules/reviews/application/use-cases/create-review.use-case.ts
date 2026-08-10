import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { AppointmentNotFoundError } from '../../../appointments/domain/errors/appointment-errors';
import { ReviewRepositoryPort } from '../../domain/review.repository.port';
import { Review } from '../../domain/entities/review.entity';
import {
  AppointmentNotReviewableError,
  ReviewAccessDeniedError,
} from '../../domain/errors/review-errors';

export interface CreateReviewInput {
  establishmentId: string;
  appointmentId: string;
  clientId: string;
  rating: number;
  comment?: string;
}

@Injectable()
export class CreateReviewUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly reviewRepository: ReviewRepositoryPort,
  ) {}

  async execute(input: CreateReviewInput): Promise<Review> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
      input.establishmentId,
    );
    if (!appointment) {
      throw new AppointmentNotFoundError(input.appointmentId);
    }
    if (appointment.clientId !== input.clientId) {
      throw new ReviewAccessDeniedError();
    }
    if (appointment.status !== 'completed') {
      throw new AppointmentNotReviewableError(appointment.status);
    }

    const review = Review.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      appointmentId: input.appointmentId,
      clientId: input.clientId,
      employeeId: appointment.employeeId,
      rating: input.rating,
      comment: input.comment,
    });

    return this.reviewRepository.create(review);
  }
}
