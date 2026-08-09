import { Injectable } from '@nestjs/common';
import { ServiceRepositoryPort } from '../../domain/service.repository.port';
import { Service } from '../../domain/entities/service.entity';
import { ServiceNotFoundError } from '../../domain/errors/service-errors';

export interface DeactivateServiceInput {
  establishmentId: string;
  serviceId: string;
}

@Injectable()
export class DeactivateServiceUseCase {
  constructor(private readonly serviceRepository: ServiceRepositoryPort) {}

  async execute(input: DeactivateServiceInput): Promise<Service> {
    const existing = await this.serviceRepository.findById(input.serviceId, input.establishmentId);
    if (!existing) {
      throw new ServiceNotFoundError(input.serviceId);
    }
    return this.serviceRepository.update(existing.deactivate());
  }
}
