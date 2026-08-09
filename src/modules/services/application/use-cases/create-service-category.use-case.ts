import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ServiceCategoryRepositoryPort } from '../../domain/service-category.repository.port';
import { ServiceCategory } from '../../domain/entities/service-category.entity';
import { DuplicateServiceCategoryNameError } from '../../domain/errors/service-errors';

export interface CreateServiceCategoryInput {
  establishmentId: string;
  name: string;
  displayOrder?: number;
}

@Injectable()
export class CreateServiceCategoryUseCase {
  constructor(private readonly categoryRepository: ServiceCategoryRepositoryPort) {}

  async execute(input: CreateServiceCategoryInput): Promise<ServiceCategory> {
    const nameTaken = await this.categoryRepository.existsWithName(input.establishmentId, input.name);
    if (nameTaken) {
      throw new DuplicateServiceCategoryNameError(input.name);
    }

    const category = ServiceCategory.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      name: input.name,
      displayOrder: input.displayOrder,
    });

    return this.categoryRepository.create(category);
  }
}
