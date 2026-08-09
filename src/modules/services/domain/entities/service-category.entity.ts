import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

export interface ServiceCategoryProps {
  id: string;
  establishmentId: string;
  name: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceCategoryProps {
  id: string;
  establishmentId: string;
  name: string;
  displayOrder?: number;
}

export class ServiceCategory {
  private constructor(private readonly props: ServiceCategoryProps) {}

  static create(props: CreateServiceCategoryProps): ServiceCategory {
    if (!props.establishmentId) {
      throw new ValidationError('ServiceCategory requer um establishmentId válido');
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('ServiceCategory requer um nome não vazio');
    }

    const now = new Date();
    return new ServiceCategory({
      id: props.id,
      establishmentId: props.establishmentId,
      name: props.name.trim(),
      displayOrder: props.displayOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: ServiceCategoryProps): ServiceCategory {
    return new ServiceCategory(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get name(): string {
    return this.props.name;
  }

  get displayOrder(): number {
    return this.props.displayOrder;
  }

  update(changes: { name?: string; displayOrder?: number }): ServiceCategory {
    const name = changes.name?.trim() ?? this.props.name;
    if (name.length === 0) {
      throw new ValidationError('ServiceCategory requer um nome não vazio');
    }
    return new ServiceCategory({
      ...this.props,
      name,
      displayOrder: changes.displayOrder ?? this.props.displayOrder,
      updatedAt: new Date(),
    });
  }

  toPersistenceProps(): ServiceCategoryProps {
    return { ...this.props };
  }
}
