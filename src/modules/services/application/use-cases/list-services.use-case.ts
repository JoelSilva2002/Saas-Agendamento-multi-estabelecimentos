import { Injectable } from '@nestjs/common';
import { ListServicesFilters, ServiceRepositoryPort } from '../../domain/service.repository.port';
import { Service } from '../../domain/entities/service.entity';

@Injectable()
export class ListServicesUseCase {
  constructor(private readonly serviceRepository: ServiceRepositoryPort) {}

  async execute(establishmentId: string, filters?: ListServicesFilters): Promise<Service[]> {
    return this.serviceRepository.findAllByEstablishment(establishmentId, filters);
  }
}
