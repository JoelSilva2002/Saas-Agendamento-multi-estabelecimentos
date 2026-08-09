import { Injectable } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../../domain/employee.repository.port';
import { EmployeeScheduleRepositoryPort } from '../../domain/employee-schedule.repository.port';
import { EmployeeScheduleSlot, ScheduleSlotType } from '../../domain/entities/employee-schedule-slot.entity';
import {
  BreakOutsideWorkingHoursError,
  EmployeeNotFoundError,
  OverlappingScheduleSlotError,
} from '../../domain/errors/employee-errors';

export interface SetEmployeeScheduleSlotInput {
  weekday: number;
  slotType: ScheduleSlotType;
  startTime: string;
  endTime: string;
}

export interface SetEmployeeScheduleInput {
  establishmentId: string;
  employeeId: string;
  slots: SetEmployeeScheduleSlotInput[];
}

@Injectable()
export class SetEmployeeScheduleUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly scheduleRepository: EmployeeScheduleRepositoryPort,
  ) {}

  async execute(input: SetEmployeeScheduleInput): Promise<EmployeeScheduleSlot[]> {
    const employee = await this.employeeRepository.findById(input.employeeId, input.establishmentId);
    if (!employee) {
      throw new EmployeeNotFoundError(input.employeeId);
    }

    const slots = input.slots.map((slot) => EmployeeScheduleSlot.create(slot));
    const workingSlots = slots.filter((slot) => slot.slotType === 'working');
    const breakSlots = slots.filter((slot) => slot.slotType === 'break');

    // Slots of the same type must not overlap (e.g. two working shifts on the same day
    // can't collide) — but a break IS expected to sit inside a working slot, so working
    // vs. break overlap is never compared here.
    for (const group of [workingSlots, breakSlots]) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (group[i].overlaps(group[j])) {
            throw new OverlappingScheduleSlotError(group[i].weekday);
          }
        }
      }
    }

    for (const breakSlot of breakSlots) {
      const containedInSomeWorkingSlot = workingSlots.some((working) => breakSlot.isWithin(working));
      if (!containedInSomeWorkingSlot) {
        throw new BreakOutsideWorkingHoursError(breakSlot.weekday);
      }
    }

    return this.scheduleRepository.replaceAll(input.employeeId, slots);
  }
}
