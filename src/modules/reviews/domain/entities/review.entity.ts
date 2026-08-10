import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export interface ReviewProps {
  id: string;
  establishmentId: string;
  appointmentId: string;
  clientId: string;
  employeeId: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface CreateReviewProps {
  id: string;
  establishmentId: string;
  appointmentId: string;
  clientId: string;
  employeeId?: string | null;
  rating: number;
  comment?: string | null;
}

export class Review {
  private constructor(private readonly props: ReviewProps) {}

  static create(props: CreateReviewProps): Review {
    if (!Number.isInteger(props.rating) || props.rating < 1 || props.rating > 5) {
      throw new ValidationError('Review requer rating inteiro entre 1 e 5');
    }

    return new Review({
      id: props.id,
      establishmentId: props.establishmentId,
      appointmentId: props.appointmentId,
      clientId: props.clientId,
      employeeId: props.employeeId ?? null,
      rating: props.rating,
      comment: props.comment?.trim() || null,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: ReviewProps): Review {
    return new Review(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get appointmentId(): string {
    return this.props.appointmentId;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get employeeId(): string | null {
    return this.props.employeeId;
  }

  get rating(): number {
    return this.props.rating;
  }

  get comment(): string | null {
    return this.props.comment;
  }

  toPersistenceProps(): ReviewProps {
    return { ...this.props };
  }
}
