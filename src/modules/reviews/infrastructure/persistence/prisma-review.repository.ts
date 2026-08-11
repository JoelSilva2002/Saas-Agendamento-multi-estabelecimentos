import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Review } from '../../domain/entities/review.entity';
import {
  ListReviewsFilters,
  ReviewRepositoryPort,
  ReviewSummary,
} from '../../domain/review.repository.port';
import { AppointmentAlreadyReviewedError } from '../../domain/errors/review-errors';
import { ReviewMapper } from './review.mapper';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaReviewRepository implements ReviewRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(review: Review): Promise<Review> {
    const props = review.toPersistenceProps();
    try {
      const created = await this.prisma.review.create({
        data: {
          id: props.id,
          establishmentId: props.establishmentId,
          appointmentId: props.appointmentId,
          clientId: props.clientId,
          employeeId: props.employeeId,
          rating: props.rating,
          comment: props.comment,
        },
      });
      return ReviewMapper.toDomain(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new AppointmentAlreadyReviewedError();
      }
      throw error;
    }
  }

  async findByAppointment(appointmentId: string): Promise<Review | null> {
    const found = await this.prisma.review.findUnique({ where: { appointmentId } });
    return found ? ReviewMapper.toDomain(found) : null;
  }

  async findById(reviewId: string, establishmentId: string): Promise<Review | null> {
    const found = await this.prisma.review.findFirst({ where: { id: reviewId, establishmentId } });
    return found ? ReviewMapper.toDomain(found) : null;
  }

  async findMany(establishmentId: string, filters: ListReviewsFilters): Promise<Review[]> {
    const records = await this.prisma.review.findMany({
      where: { establishmentId, employeeId: filters.employeeId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(ReviewMapper.toDomain);
  }

  async getAverageRating(establishmentId: string, employeeId?: string): Promise<ReviewSummary> {
    const result = await this.prisma.review.aggregate({
      where: { establishmentId, employeeId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return { average: result._avg.rating ?? 0, count: result._count.rating };
  }

  async delete(reviewId: string): Promise<void> {
    await this.prisma.review.delete({ where: { id: reviewId } });
  }
}
