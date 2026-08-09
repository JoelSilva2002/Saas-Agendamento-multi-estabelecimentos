import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export type ServiceStatus = 'active' | 'inactive';

export interface ServiceProps {
  id: string;
  establishmentId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceProps {
  id: string;
  establishmentId: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  priceCents: number;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
}

export class Service {
  private constructor(private readonly props: ServiceProps) {}

  static create(props: CreateServiceProps): Service {
    if (!props.establishmentId) {
      throw new ValidationError('Service requer um establishmentId válido');
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('Service requer um nome não vazio');
    }
    if (!Number.isInteger(props.priceCents) || props.priceCents < 0) {
      throw new ValidationError('Service requer priceCents inteiro e não negativo');
    }
    if (!Number.isInteger(props.durationMinutes) || props.durationMinutes <= 0) {
      throw new ValidationError('Service requer durationMinutes inteiro e positivo');
    }
    const bufferBefore = props.bufferBeforeMinutes ?? 0;
    const bufferAfter = props.bufferAfterMinutes ?? 0;
    if (!Number.isInteger(bufferBefore) || bufferBefore < 0) {
      throw new ValidationError('bufferBeforeMinutes deve ser um inteiro não negativo');
    }
    if (!Number.isInteger(bufferAfter) || bufferAfter < 0) {
      throw new ValidationError('bufferAfterMinutes deve ser um inteiro não negativo');
    }

    const now = new Date();
    return new Service({
      id: props.id,
      establishmentId: props.establishmentId,
      categoryId: props.categoryId ?? null,
      name: props.name.trim(),
      description: props.description ?? null,
      priceCents: props.priceCents,
      durationMinutes: props.durationMinutes,
      bufferBeforeMinutes: bufferBefore,
      bufferAfterMinutes: bufferAfter,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: ServiceProps): Service {
    return new Service(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get categoryId(): string | null {
    return this.props.categoryId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get priceCents(): number {
    return this.props.priceCents;
  }

  get durationMinutes(): number {
    return this.props.durationMinutes;
  }

  get bufferBeforeMinutes(): number {
    return this.props.bufferBeforeMinutes;
  }

  get bufferAfterMinutes(): number {
    return this.props.bufferAfterMinutes;
  }

  get status(): ServiceStatus {
    return this.props.status;
  }

  update(changes: {
    categoryId?: string | null;
    name?: string;
    description?: string | null;
    priceCents?: number;
    durationMinutes?: number;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
  }): Service {
    const name = changes.name?.trim() ?? this.props.name;
    if (name.length === 0) {
      throw new ValidationError('Service requer um nome não vazio');
    }
    const priceCents = changes.priceCents ?? this.props.priceCents;
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      throw new ValidationError('Service requer priceCents inteiro e não negativo');
    }
    const durationMinutes = changes.durationMinutes ?? this.props.durationMinutes;
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      throw new ValidationError('Service requer durationMinutes inteiro e positivo');
    }
    const bufferBeforeMinutes = changes.bufferBeforeMinutes ?? this.props.bufferBeforeMinutes;
    const bufferAfterMinutes = changes.bufferAfterMinutes ?? this.props.bufferAfterMinutes;

    return new Service({
      ...this.props,
      categoryId: changes.categoryId !== undefined ? changes.categoryId : this.props.categoryId,
      name,
      description: changes.description !== undefined ? changes.description : this.props.description,
      priceCents,
      durationMinutes,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      updatedAt: new Date(),
    });
  }

  deactivate(): Service {
    return new Service({ ...this.props, status: 'inactive', updatedAt: new Date() });
  }

  activate(): Service {
    return new Service({ ...this.props, status: 'active', updatedAt: new Date() });
  }

  toPersistenceProps(): ServiceProps {
    return { ...this.props };
  }
}
