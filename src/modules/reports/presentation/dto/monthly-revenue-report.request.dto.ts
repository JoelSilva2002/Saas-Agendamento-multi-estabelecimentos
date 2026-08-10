import { Matches } from 'class-validator';

export class MonthlyRevenueReportRequestDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'month deve estar no formato YYYY-MM' })
  month!: string;
}
