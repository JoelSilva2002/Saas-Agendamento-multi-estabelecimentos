import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ServiceRepositoryPort } from '../../domain/service.repository.port';
import { ServiceCategoryRepositoryPort } from '../../domain/service-category.repository.port';
import { Service } from '../../domain/entities/service.entity';
import { ServiceCategoryNotFoundError } from '../../domain/errors/service-errors';

export interface CreateServiceInput {
  establishmentId: string;
  categoryId?: string;
  name: string;
  description?: string;
  priceCents: number;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
}

@Injectable()
export class CreateServiceUseCase {
  constructor(
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly categoryRepository: ServiceCategoryRepositoryPort,
  ) {}

  async execute(input: CreateServiceInput): Promise<Service> {
    if (input.categoryId) {
      const category = await this.categoryRepository.findById(input.categoryId, input.establishmentId);
      if (!category) {
        throw new ServiceCategoryNotFoundError(input.categoryId);
      }
    }

    const service = Service.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      durationMinutes: input.durationMinutes,
      bufferBeforeMinutes: input.bufferBeforeMinutes,
      bufferAfterMinutes: input.bufferAfterMinutes,
    });

    return this.serviceRepository.create(service);
  }
}
