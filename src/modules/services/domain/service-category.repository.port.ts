import { ServiceCategory } from './entities/service-category.entity';

export abstract class ServiceCategoryRepositoryPort {
  abstract create(category: ServiceCategory): Promise<ServiceCategory>;
  abstract findById(id: string, establishmentId: string): Promise<ServiceCategory | null>;
  abstract findAllByEstablishment(establishmentId: string): Promise<ServiceCategory[]>;
  abstract update(category: ServiceCategory): Promise<ServiceCategory>;
  abstract delete(id: string, establishmentId: string): Promise<void>;
  abstract existsWithName(establishmentId: string, name: string, excludeId?: string): Promise<boolean>;
}
