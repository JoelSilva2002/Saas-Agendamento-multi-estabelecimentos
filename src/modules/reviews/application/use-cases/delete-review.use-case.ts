import { Injectable } from '@nestjs/common';
import { ReviewRepositoryPort } from '../../domain/review.repository.port';
import { ReviewNotFoundError } from '../../domain/errors/review-errors';

export interface DeleteReviewInput {
  establishmentId: string;
  reviewId: string;
}

@Injectable()
export class DeleteReviewUseCase {
  constructor(private readonly reviewRepository: ReviewRepositoryPort) {}

  async execute(input: DeleteReviewInput): Promise<void> {
    const review = await this.reviewRepository.findById(input.reviewId, input.establishmentId);
    if (!review) {
      throw new ReviewNotFoundError(input.reviewId);
    }
    await this.reviewRepository.delete(review.id);
  }
}
