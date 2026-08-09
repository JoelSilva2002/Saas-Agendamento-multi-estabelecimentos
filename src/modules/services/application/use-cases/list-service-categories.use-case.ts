import { Injectable } from '@nestjs/common';
import { ServiceCategoryRepositoryPort } from '../../domain/service-category.repository.port';
import { ServiceCategory } from '../../domain/entities/service-category.entity';

@Injectable()
export class ListServiceCategoriesUseCase {
  constructor(private readonly categoryRepository: ServiceCategoryRepositoryPort) {}

  async execute(establishmentId: string): Promise<ServiceCategory[]> {
    return this.categoryRepository.findAllByEstablishment(establishmentId);
  }
}
