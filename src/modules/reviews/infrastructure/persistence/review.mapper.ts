import { Review as PrismaReview } from '@prisma/client';
import { Review } from '../../domain/entities/review.entity';

export class ReviewMapper {
  static toDomain(record: PrismaReview): Review {
    return Review.fromPersistence({
      id: record.id,
      establishmentId: record.establishmentId,
      appointmentId: record.appointmentId,
      clientId: record.clientId,
      employeeId: record.employeeId,
      rating: record.rating,
      comment: record.comment,
      createdAt: record.createdAt,
    });
  }
}
