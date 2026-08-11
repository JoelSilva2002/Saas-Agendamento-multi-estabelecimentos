export type TenantUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

export type InviteUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  establishmentId?: string;
};

export type InviteUserOutput = {
  user: TenantUser;
  /** Only present when a brand-new account was created — absent when an existing tenant user
   * was simply granted a new role. */
  temporaryPassword?: string;
};
