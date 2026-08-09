import { IsOptional, IsUUID } from 'class-validator';

export class UpdateUserRoleRequestDto {
  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  establishmentId?: string;
}
