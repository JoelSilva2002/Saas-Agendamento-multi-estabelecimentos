import { Injectable } from '@nestjs/common';
import { ListReviewsFilters, ReviewRepositoryPort } from '../../domain/review.repository.port';
import { Review } from '../../domain/entities/review.entity';

@Injectable()
export class ListReviewsUseCase {
  constructor(private readonly reviewRepository: ReviewRepositoryPort) {}

  async execute(establishmentId: string, filters: ListReviewsFilters): Promise<Review[]> {
    return this.reviewRepository.findMany(establishmentId, filters);
  }
}
