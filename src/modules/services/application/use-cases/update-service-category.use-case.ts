import { Injectable } from '@nestjs/common';
import { ServiceCategoryRepositoryPort } from '../../domain/service-category.repository.port';
import { ServiceCategory } from '../../domain/entities/service-category.entity';
import { DuplicateServiceCategoryNameError, ServiceCategoryNotFoundError } from '../../domain/errors/service-errors';

export interface UpdateServiceCategoryInput {
  establishmentId: string;
  categoryId: string;
  name?: string;
  displayOrder?: number;
}

@Injectable()
export class UpdateServiceCategoryUseCase {
  constructor(private readonly categoryRepository: ServiceCategoryRepositoryPort) {}

  async execute(input: UpdateServiceCategoryInput): Promise<ServiceCategory> {
    const existing = await this.categoryRepository.findById(input.categoryId, input.establishmentId);
    if (!existing) {
      throw new ServiceCategoryNotFoundError(input.categoryId);
    }

    if (input.name && input.name !== existing.name) {
      const nameTaken = await this.categoryRepository.existsWithName(input.establishmentId, input.name, existing.id);
      if (nameTaken) {
        throw new DuplicateServiceCategoryNameError(input.name);
      }
    }

    const updated = existing.update({ name: input.name, displayOrder: input.displayOrder });
    return this.categoryRepository.update(updated);
  }
}
