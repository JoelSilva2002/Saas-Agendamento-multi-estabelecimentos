import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetServiceEmployeesRequestDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  employeeIds!: string[];
}
