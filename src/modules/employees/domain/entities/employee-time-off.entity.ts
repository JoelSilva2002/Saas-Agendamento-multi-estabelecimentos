import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type TimeOffType = 'vacation' | 'sick_leave' | 'day_off' | 'other';

export interface EmployeeTimeOffProps {
  id: string;
  employeeId: string;
  type: TimeOffType;
  startAt: Date;
  endAt: Date;
  notes: string | null;
  createdAt: Date;
}

export interface CreateEmployeeTimeOffProps {
  id: string;
  employeeId: string;
  type: TimeOffType;
  startAt: Date;
  endAt: Date;
  notes?: string | null;
}

export class EmployeeTimeOff {
  private constructor(private readonly props: EmployeeTimeOffProps) {}

  static create(props: CreateEmployeeTimeOffProps): EmployeeTimeOff {
    if (!props.employeeId) {
      throw new ValidationError('EmployeeTimeOff requer um employeeId válido');
    }
    if (props.startAt >= props.endAt) {
      throw new ValidationError('startAt deve ser anterior a endAt');
    }
    return new EmployeeTimeOff({
      id: props.id,
      employeeId: props.employeeId,
      type: props.type,
      startAt: props.startAt,
      endAt: props.endAt,
      notes: props.notes ?? null,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: EmployeeTimeOffProps): EmployeeTimeOff {
    return new EmployeeTimeOff(props);
  }

  get id(): string {
    return this.props.id;
  }

  get employeeId(): string {
    return this.props.employeeId;
  }

  get type(): TimeOffType {
    return this.props.type;
  }

  get startAt(): Date {
    return this.props.startAt;
  }

  get endAt(): Date {
    return this.props.endAt;
  }

  get notes(): string | null {
    return this.props.notes;
  }
}
