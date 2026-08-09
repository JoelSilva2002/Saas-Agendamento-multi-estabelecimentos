import { Service, ServiceStatus } from './entities/service.entity';

export interface ListServicesFilters {
  categoryId?: string;
  status?: ServiceStatus;
}

export abstract class ServiceRepositoryPort {
  abstract create(service: Service): Promise<Service>;
  abstract findById(id: string, establishmentId: string): Promise<Service | null>;
  abstract findAllByEstablishment(establishmentId: string, filters?: ListServicesFilters): Promise<Service[]>;
  abstract update(service: Service): Promise<Service>;

  /** Replaces the full set of employees eligible to perform a service in one transaction. */
  abstract replaceEligibleEmployees(serviceId: string, employeeIds: string[]): Promise<void>;
  abstract findEligibleEmployeeIds(serviceId: string): Promise<string[]>;
}
