import { CreateEmployeeUseCase } from './create-employee.use-case';
import { EmployeeRepositoryPort } from '../../domain/employee.repository.port';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { UserNotMemberOfEstablishmentError } from '../../domain/errors/employee-errors';

describe('CreateEmployeeUseCase', () => {
  function build(overrides?: { userRepository?: Partial<UserRepositoryPort> }) {
    const employeeRepository: EmployeeRepositoryPort = {
      create: jest.fn().mockImplementation(async (employee) => employee),
      findById: jest.fn(),
      findByUserAndEstablishment: jest.fn(),
      findAllByEstablishment: jest.fn(),
      update: jest.fn(),
      existsInEstablishment: jest.fn(),
    } as unknown as EmployeeRepositoryPort;

    const userRepository: UserRepositoryPort = {
      existsInTenant: jest.fn().mockResolvedValue(true),
      ...overrides?.userRepository,
    } as unknown as UserRepositoryPort;

    return { useCase: new CreateEmployeeUseCase(employeeRepository, userRepository), employeeRepository };
  }

  const input = { tenantId: 'tenant-1', establishmentId: 'establishment-1', userId: 'user-1', jobTitle: 'Barbeiro' };

  it('creates the employee profile when the user is already a tenant member', async () => {
    const { useCase, employeeRepository } = build();

    const employee = await useCase.execute(input);

    expect(employee.jobTitle).toBe('Barbeiro');
    expect(employeeRepository.create).toHaveBeenCalledTimes(1);
  });

  it('rejects when the user does not belong to the tenant', async () => {
    const { useCase, employeeRepository } = build({
      userRepository: { existsInTenant: jest.fn().mockResolvedValue(false) },
    });

    await expect(useCase.execute(input)).rejects.toThrow(UserNotMemberOfEstablishmentError);
    expect(employeeRepository.create).not.toHaveBeenCalled();
  });
});
