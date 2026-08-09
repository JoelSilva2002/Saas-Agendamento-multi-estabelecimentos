import { SetServiceEmployeesUseCase } from './set-service-employees.use-case';
import { ServiceRepositoryPort } from '../../domain/service.repository.port';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { Service } from '../../domain/entities/service.entity';
import { InvalidServiceEmployeeError, ServiceNotFoundError } from '../../domain/errors/service-errors';

describe('SetServiceEmployeesUseCase', () => {
  const service = Service.create({
    id: 'service-1',
    establishmentId: 'establishment-1',
    name: 'Corte',
    priceCents: 5000,
    durationMinutes: 30,
  });

  function build(overrides?: { employeeRepository?: Partial<EmployeeRepositoryPort> }) {
    const serviceRepository: ServiceRepositoryPort = {
      findById: jest.fn().mockResolvedValue(service),
      replaceEligibleEmployees: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
      findAllByEstablishment: jest.fn(),
      update: jest.fn(),
      findEligibleEmployeeIds: jest.fn(),
    } as unknown as ServiceRepositoryPort;

    const employeeRepository: EmployeeRepositoryPort = {
      existsInEstablishment: jest.fn().mockResolvedValue(true),
      create: jest.fn(),
      findById: jest.fn(),
      findByUserAndEstablishment: jest.fn(),
      findAllByEstablishment: jest.fn(),
      update: jest.fn(),
      ...overrides?.employeeRepository,
    } as unknown as EmployeeRepositoryPort;

    return { useCase: new SetServiceEmployeesUseCase(serviceRepository, employeeRepository), serviceRepository };
  }

  it('replaces the eligible employee set when all employees belong to the establishment', async () => {
    const { useCase, serviceRepository } = build();

    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      serviceId: 'service-1',
      employeeIds: ['employee-1', 'employee-2', 'employee-1'],
    });

    expect(result).toEqual(['employee-1', 'employee-2']);
    expect(serviceRepository.replaceEligibleEmployees).toHaveBeenCalledWith('service-1', ['employee-1', 'employee-2']);
  });

  it('rejects an employeeId that does not belong to the same establishment', async () => {
    const { useCase, serviceRepository } = build({
      employeeRepository: { existsInEstablishment: jest.fn().mockResolvedValue(false) },
    });

    await expect(
      useCase.execute({ establishmentId: 'establishment-1', serviceId: 'service-1', employeeIds: ['employee-x'] }),
    ).rejects.toThrow(InvalidServiceEmployeeError);
    expect(serviceRepository.replaceEligibleEmployees).not.toHaveBeenCalled();
  });

  it('throws ServiceNotFoundError when the service does not exist in the establishment', async () => {
    const serviceRepository: ServiceRepositoryPort = {
      findById: jest.fn().mockResolvedValue(null),
      replaceEligibleEmployees: jest.fn(),
    } as unknown as ServiceRepositoryPort;
    const employeeRepository: EmployeeRepositoryPort = {} as unknown as EmployeeRepositoryPort;
    const useCase = new SetServiceEmployeesUseCase(serviceRepository, employeeRepository);

    await expect(
      useCase.execute({ establishmentId: 'establishment-1', serviceId: 'missing', employeeIds: [] }),
    ).rejects.toThrow(ServiceNotFoundError);
  });
});
