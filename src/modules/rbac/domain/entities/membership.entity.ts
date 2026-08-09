export interface MembershipProps {
  id: string;
  userId: string;
  tenantId: string;
  establishmentId: string | null;
  roleId: string;
  createdAt: Date;
}

export class Membership {
  private constructor(private readonly props: MembershipProps) {}

  static fromPersistence(props: MembershipProps): Membership {
    return new Membership(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get establishmentId(): string | null {
    return this.props.establishmentId;
  }

  get roleId(): string {
    return this.props.roleId;
  }
}

/** A resolved grant: one membership row enriched with its role name and permission keys,
 * as returned by the membership repository for permission resolution. */
export interface MembershipGrant {
  establishmentId: string | null;
  roleName: string;
  permissionKeys: string[];
}
