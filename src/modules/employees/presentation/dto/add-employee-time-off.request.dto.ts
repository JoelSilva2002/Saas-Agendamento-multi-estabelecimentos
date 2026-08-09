import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

const TIME_OFF_TYPES = ['vacation', 'sick_leave', 'day_off', 'other'] as const;

export class AddEmployeeTimeOffRequestDto {
  @IsIn(TIME_OFF_TYPES)
  type!: (typeof TIME_OFF_TYPES)[number];

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
