export interface RoleProps {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionKeys: string[];
}

export class Role {
  private constructor(private readonly props: RoleProps) {}

  static fromPersistence(props: RoleProps): Role {
    return new Role(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  get permissionKeys(): string[] {
    return this.props.permissionKeys;
  }
}
