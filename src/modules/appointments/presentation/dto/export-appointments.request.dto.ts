import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';

export class ExportAppointmentsRequestDto {
  @IsIn(['csv', 'pdf'])
  format!: 'csv' | 'pdf';

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;
}
