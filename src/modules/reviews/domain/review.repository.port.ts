import { Review } from './entities/review.entity';

export interface ListReviewsFilters {
  employeeId?: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
}

export abstract class ReviewRepositoryPort {
  /** Throws AppointmentAlreadyReviewedError (translating the DB's unique-constraint
   * violation on appointmentId) if this appointment was already reviewed. */
  abstract create(review: Review): Promise<Review>;
  abstract findByAppointment(appointmentId: string): Promise<Review | null>;
  abstract findById(reviewId: string, establishmentId: string): Promise<Review | null>;
  abstract findMany(establishmentId: string, filters: ListReviewsFilters): Promise<Review[]>;
  abstract getAverageRating(establishmentId: string, employeeId?: string): Promise<ReviewSummary>;
  abstract delete(reviewId: string): Promise<void>;
}
