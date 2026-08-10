import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class DateRangeReportRequestDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;
}
