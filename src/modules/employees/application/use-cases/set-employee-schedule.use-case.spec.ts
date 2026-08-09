import { SetEmployeeScheduleUseCase } from './set-employee-schedule.use-case';
import { EmployeeRepositoryPort } from '../../domain/employee.repository.port';
import { EmployeeScheduleRepositoryPort } from '../../domain/employee-schedule.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import { BreakOutsideWorkingHoursError, OverlappingScheduleSlotError } from '../../domain/errors/employee-errors';

describe('SetEmployeeScheduleUseCase', () => {
  const employee = Employee.create({
    id: 'employee-1',
    establishmentId: 'establishment-1',
    userId: 'user-1',
    jobTitle: 'Barbeiro',
  });

  function build() {
    const employeeRepository: EmployeeRepositoryPort = {
      findById: jest.fn().mockResolvedValue(employee),
    } as unknown as EmployeeRepositoryPort;

    const scheduleRepository: EmployeeScheduleRepositoryPort = {
      replaceAll: jest.fn().mockImplementation(async (_employeeId, slots) => slots),
      findAllByEmployee: jest.fn(),
    } as unknown as EmployeeScheduleRepositoryPort;

    return { useCase: new SetEmployeeScheduleUseCase(employeeRepository, scheduleRepository), scheduleRepository };
  }

  it('replaces the schedule when slots do not overlap', async () => {
    const { useCase, scheduleRepository } = build();

    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      employeeId: 'employee-1',
      slots: [
        { weekday: 1, slotType: 'working', startTime: '09:00', endTime: '18:00' },
        { weekday: 1, slotType: 'break', startTime: '12:00', endTime: '13:00' },
      ],
    });

    expect(result).toHaveLength(2);
    expect(scheduleRepository.replaceAll).toHaveBeenCalledTimes(1);
  });

  it('rejects two overlapping working slots on the same weekday', async () => {
    const { useCase, scheduleRepository } = build();

    await expect(
      useCase.execute({
        establishmentId: 'establishment-1',
        employeeId: 'employee-1',
        slots: [
          { weekday: 1, slotType: 'working', startTime: '09:00', endTime: '14:00' },
          { weekday: 1, slotType: 'working', startTime: '13:00', endTime: '18:00' },
        ],
      }),
    ).rejects.toThrow(OverlappingScheduleSlotError);
    expect(scheduleRepository.replaceAll).not.toHaveBeenCalled();
  });

  it('rejects a break that falls outside every working slot', async () => {
    const { useCase, scheduleRepository } = build();

    await expect(
      useCase.execute({
        establishmentId: 'establishment-1',
        employeeId: 'employee-1',
        slots: [
          { weekday: 1, slotType: 'working', startTime: '09:00', endTime: '18:00' },
          { weekday: 1, slotType: 'break', startTime: '17:00', endTime: '19:00' },
        ],
      }),
    ).rejects.toThrow(BreakOutsideWorkingHoursError);
    expect(scheduleRepository.replaceAll).not.toHaveBeenCalled();
  });
});
