import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';

export class ListAvailabilityRequestDto {
  @IsUUID()
  serviceId!: string;

  @IsUUID()
  employeeId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  slotIntervalMinutes?: number;
}
