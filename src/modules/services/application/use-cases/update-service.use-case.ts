import { Injectable } from '@nestjs/common';
import { ServiceRepositoryPort } from '../../domain/service.repository.port';
import { ServiceCategoryRepositoryPort } from '../../domain/service-category.repository.port';
import { Service } from '../../domain/entities/service.entity';
import { ServiceCategoryNotFoundError, ServiceNotFoundError } from '../../domain/errors/service-errors';

export interface UpdateServiceInput {
  establishmentId: string;
  serviceId: string;
  categoryId?: string | null;
  name?: string;
  description?: string | null;
  priceCents?: number;
  durationMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
}

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly categoryRepository: ServiceCategoryRepositoryPort,
  ) {}

  async execute(input: UpdateServiceInput): Promise<Service> {
    const existing = await this.serviceRepository.findById(input.serviceId, input.establishmentId);
    if (!existing) {
      throw new ServiceNotFoundError(input.serviceId);
    }

    if (input.categoryId) {
      const category = await this.categoryRepository.findById(input.categoryId, input.establishmentId);
      if (!category) {
        throw new ServiceCategoryNotFoundError(input.categoryId);
      }
    }

    const updated = existing.update({
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      durationMinutes: input.durationMinutes,
      bufferBeforeMinutes: input.bufferBeforeMinutes,
      bufferAfterMinutes: input.bufferAfterMinutes,
    });

    return this.serviceRepository.update(updated);
  }
}
