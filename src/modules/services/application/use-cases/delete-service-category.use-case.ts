import { Injectable } from '@nestjs/common';
import { ServiceCategoryRepositoryPort } from '../../domain/service-category.repository.port';
import { ServiceCategoryNotFoundError } from '../../domain/errors/service-errors';

export interface DeleteServiceCategoryInput {
  establishmentId: string;
  categoryId: string;
}

@Injectable()
export class DeleteServiceCategoryUseCase {
  constructor(private readonly categoryRepository: ServiceCategoryRepositoryPort) {}

  async execute(input: DeleteServiceCategoryInput): Promise<void> {
    const existing = await this.categoryRepository.findById(input.categoryId, input.establishmentId);
    if (!existing) {
      throw new ServiceCategoryNotFoundError(input.categoryId);
    }
    // Services referencing this category have category_id set to NULL by the DB
    // (ON DELETE SET NULL) — they simply become uncategorized, never broken.
    await this.categoryRepository.delete(input.categoryId, input.establishmentId);
  }
}
