import { Injectable } from '@nestjs/common';
import { ReviewRepositoryPort, ReviewSummary } from '../../domain/review.repository.port';

@Injectable()
export class GetReviewSummaryUseCase {
  constructor(private readonly reviewRepository: ReviewRepositoryPort) {}

  async execute(establishmentId: string, employeeId?: string): Promise<ReviewSummary> {
    return this.reviewRepository.getAverageRating(establishmentId, employeeId);
  }
}
