export interface PermissionProps {
  id: string;
  key: string;
  description: string;
}

export class Permission {
  private constructor(private readonly props: PermissionProps) {}

  static fromPersistence(props: PermissionProps): Permission {
    return new Permission(props);
  }

  get id(): string {
    return this.props.id;
  }

  get key(): string {
    return this.props.key;
  }

  get description(): string {
    return this.props.description;
  }
}
