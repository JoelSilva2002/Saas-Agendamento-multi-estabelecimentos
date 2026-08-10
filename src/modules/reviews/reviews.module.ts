import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ReviewRepositoryPort } from './domain/review.repository.port';
import { PrismaReviewRepository } from './infrastructure/persistence/prisma-review.repository';
import { CreateReviewUseCase } from './application/use-cases/create-review.use-case';
import { ListReviewsUseCase } from './application/use-cases/list-reviews.use-case';
import { GetReviewSummaryUseCase } from './application/use-cases/get-review-summary.use-case';
import { ReviewsController } from './presentation/reviews.controller';

@Module({
  imports: [AppointmentsModule],
  controllers: [ReviewsController],
  providers: [
    { provide: ReviewRepositoryPort, useClass: PrismaReviewRepository },
    CreateReviewUseCase,
    ListReviewsUseCase,
    GetReviewSummaryUseCase,
  ],
})
export class ReviewsModule {}
