import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export interface AgendaBlockProps {
  id: string;
  establishmentId: string;
  employeeId: string | null;
  startAt: Date;
  endAt: Date;
  reason: string | null;
  createdById: string;
  createdAt: Date;
}

export interface CreateAgendaBlockProps {
  id: string;
  establishmentId: string;
  employeeId?: string | null;
  startAt: Date;
  endAt: Date;
  reason?: string | null;
  createdById: string;
}

// Ad-hoc manual block (e.g. "reunião", "manutenção"), independent of the recurring weekly
// schedule — see the AgendaBlock Prisma model comment. employeeId = null blocks the shared
// establishment-level resource rather than one specific professional.
export class AgendaBlock {
  private constructor(private readonly props: AgendaBlockProps) {}

  static create(props: CreateAgendaBlockProps): AgendaBlock {
    if (!props.establishmentId || !props.createdById) {
      throw new ValidationError('AgendaBlock requer establishmentId e createdById');
    }
    if (props.endAt <= props.startAt) {
      throw new ValidationError('AgendaBlock requer endAt posterior a startAt');
    }

    return new AgendaBlock({
      id: props.id,
      establishmentId: props.establishmentId,
      employeeId: props.employeeId ?? null,
      startAt: props.startAt,
      endAt: props.endAt,
      reason: props.reason?.trim() || null,
      createdById: props.createdById,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: AgendaBlockProps): AgendaBlock {
    return new AgendaBlock(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get employeeId(): string | null {
    return this.props.employeeId;
  }

  get startAt(): Date {
    return this.props.startAt;
  }

  get endAt(): Date {
    return this.props.endAt;
  }

  get reason(): string | null {
    return this.props.reason;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toPersistenceProps(): AgendaBlockProps {
    return { ...this.props };
  }
}
