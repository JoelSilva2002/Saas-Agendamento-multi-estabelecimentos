import { Injectable } from '@nestjs/common';
import { ServiceRepositoryPort } from '../../domain/service.repository.port';
import { Service } from '../../domain/entities/service.entity';
import { ServiceNotFoundError } from '../../domain/errors/service-errors';

export interface GetServiceInput {
  establishmentId: string;
  serviceId: string;
}

@Injectable()
export class GetServiceUseCase {
  constructor(private readonly serviceRepository: ServiceRepositoryPort) {}

  async execute(input: GetServiceInput): Promise<Service> {
    const service = await this.serviceRepository.findById(input.serviceId, input.establishmentId);
    if (!service) {
      throw new ServiceNotFoundError(input.serviceId);
    }
    return service;
  }
}
