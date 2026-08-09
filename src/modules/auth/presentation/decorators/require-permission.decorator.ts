import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (permissionKey: string): MethodDecorator =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permissionKey);
