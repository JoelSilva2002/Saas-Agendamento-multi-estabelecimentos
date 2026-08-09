import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type EmployeeStatus = 'active' | 'inactive';

export interface EmployeeProps {
  id: string;
  establishmentId: string;
  userId: string;
  jobTitle: string;
  status: EmployeeStatus;
  hiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeProps {
  id: string;
  establishmentId: string;
  userId: string;
  jobTitle: string;
  hiredAt?: Date | null;
}

export class Employee {
  private constructor(private readonly props: EmployeeProps) {}

  static create(props: CreateEmployeeProps): Employee {
    if (!props.establishmentId) {
      throw new ValidationError('Employee requer um establishmentId válido');
    }
    if (!props.userId) {
      throw new ValidationError('Employee requer um userId válido');
    }
    if (!props.jobTitle || props.jobTitle.trim().length === 0) {
      throw new ValidationError('Employee requer um cargo (jobTitle) não vazio');
    }

    const now = new Date();
    return new Employee({
      id: props.id,
      establishmentId: props.establishmentId,
      userId: props.userId,
      jobTitle: props.jobTitle.trim(),
      status: 'active',
      hiredAt: props.hiredAt ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: EmployeeProps): Employee {
    return new Employee(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get jobTitle(): string {
    return this.props.jobTitle;
  }

  get status(): EmployeeStatus {
    return this.props.status;
  }

  get hiredAt(): Date | null {
    return this.props.hiredAt;
  }

  update(changes: { jobTitle?: string; hiredAt?: Date | null }): Employee {
    const jobTitle = changes.jobTitle?.trim() ?? this.props.jobTitle;
    if (jobTitle.length === 0) {
      throw new ValidationError('Employee requer um cargo (jobTitle) não vazio');
    }
    return new Employee({
      ...this.props,
      jobTitle,
      hiredAt: changes.hiredAt !== undefined ? changes.hiredAt : this.props.hiredAt,
      updatedAt: new Date(),
    });
  }

  deactivate(): Employee {
    return new Employee({ ...this.props, status: 'inactive', updatedAt: new Date() });
  }

  activate(): Employee {
    return new Employee({ ...this.props, status: 'active', updatedAt: new Date() });
  }

  toPersistenceProps(): EmployeeProps {
    return { ...this.props };
  }
}
