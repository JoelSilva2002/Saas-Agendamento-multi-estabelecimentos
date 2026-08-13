import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class EmployeeScheduleSlotRequestDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsIn(['working', 'break'])
  slotType!: 'working' | 'break';

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;
}

export class SetEmployeeScheduleRequestDto {
  @IsArray()
  @ArrayMaxSize(63) // 7 dias x até 9 slots/dia (1 jornada + várias pausas)
  @ValidateNested({ each: true })
  @Type(() => EmployeeScheduleSlotRequestDto)
  slots!: EmployeeScheduleSlotRequestDto[];
}
