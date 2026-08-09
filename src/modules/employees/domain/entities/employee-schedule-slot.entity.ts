import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type ScheduleSlotType = 'working' | 'break';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface EmployeeScheduleSlotProps {
  weekday: number; // 0 = domingo .. 6 = sábado
  slotType: ScheduleSlotType;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export class EmployeeScheduleSlot {
  private constructor(private readonly props: EmployeeScheduleSlotProps) {}

  static create(props: EmployeeScheduleSlotProps): EmployeeScheduleSlot {
    if (!Number.isInteger(props.weekday) || props.weekday < 0 || props.weekday > 6) {
      throw new ValidationError('weekday deve ser um inteiro entre 0 (domingo) e 6 (sábado)');
    }
    if (!TIME_REGEX.test(props.startTime)) {
      throw new ValidationError('startTime inválido (esperado HH:mm)');
    }
    if (!TIME_REGEX.test(props.endTime)) {
      throw new ValidationError('endTime inválido (esperado HH:mm)');
    }
    if (props.startTime >= props.endTime) {
      throw new ValidationError('startTime deve ser anterior a endTime');
    }
    return new EmployeeScheduleSlot(props);
  }

  static fromPersistence(props: EmployeeScheduleSlotProps): EmployeeScheduleSlot {
    return new EmployeeScheduleSlot(props);
  }

  get weekday(): number {
    return this.props.weekday;
  }

  get slotType(): ScheduleSlotType {
    return this.props.slotType;
  }

  get startTime(): string {
    return this.props.startTime;
  }

  get endTime(): string {
    return this.props.endTime;
  }

  overlaps(other: EmployeeScheduleSlot): boolean {
    if (this.weekday !== other.weekday) return false;
    return this.startTime < other.endTime && other.startTime < this.endTime;
  }

  /** True when this slot's time range is fully contained within `other`'s, on the same
   * weekday — used to validate that a break falls inside some working slot. */
  isWithin(other: EmployeeScheduleSlot): boolean {
    if (this.weekday !== other.weekday) return false;
    return this.startTime >= other.startTime && this.endTime <= other.endTime;
  }
}
