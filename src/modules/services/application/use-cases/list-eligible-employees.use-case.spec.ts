import { ListEligibleEmployeesUseCase } from './list-eligible-employees.use-case';
import { ServiceRepositoryPort } from '../../domain/service.repository.port';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { Service } from '../../domain/entities/service.entity';
import { Employee } from '../../../employees/domain/entities/employee.entity';
import { ServiceNotFoundError } from '../../domain/errors/service-errors';

describe('ListEligibleEmployeesUseCase', () => {
  const service = Service.create({
    id: 'service-1',
    establishmentId: 'establishment-1',
    name: 'Corte',
    priceCents: 5000,
    durationMinutes: 30,
  });

  const activeEligible = Employee.create({
    id: 'employee-1',
    establishmentId: 'establishment-1',
    userId: 'user-1',
    jobTitle: 'Barbeiro',
  });

  const inactiveEligible = Employee.create({
    id: 'employee-2',
    establishmentId: 'establishment-1',
    userId: 'user-2',
    jobTitle: 'Barbeiro',
  }).deactivate();

  const activeIneligible = Employee.create({
    id: 'employee-3',
    establishmentId: 'establishment-1',
    userId: 'user-3',
    jobTitle: 'Barbeiro',
  });

  function build(overrides?: {
    serviceRepository?: Partial<ServiceRepositoryPort>;
    employeeRepository?: Partial<EmployeeRepositoryPort>;
  }) {
    const serviceRepository: ServiceRepositoryPort = {
      findById: jest.fn().mockResolvedValue(service),
      findEligibleEmployeeIds: jest.fn().mockResolvedValue(['employee-1', 'employee-2']),
      ...overrides?.serviceRepository,
    } as unknown as ServiceRepositoryPort;

    const employeeRepository: EmployeeRepositoryPort = {
      findAllByEstablishment: jest
        .fn()
        .mockResolvedValue([activeEligible, inactiveEligible, activeIneligible]),
      ...overrides?.employeeRepository,
    } as unknown as EmployeeRepositoryPort;

    return { useCase: new ListEligibleEmployeesUseCase(serviceRepository, employeeRepository) };
  }

  it('returns only active employees eligible for the service', async () => {
    const { useCase } = build();
    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      serviceId: 'service-1',
    });
    expect(result.map((e) => e.id)).toEqual(['employee-1']);
  });

  it('throws ServiceNotFoundError when the service does not exist', async () => {
    const { useCase } = build({
      serviceRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      useCase.execute({ establishmentId: 'establishment-1', serviceId: 'missing' }),
    ).rejects.toThrow(ServiceNotFoundError);
  });
});
