import { Controller, Get, Param, Query } from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { GetDailySummaryUseCase } from '../application/use-cases/get-daily-summary.use-case';
import { GetDailySummaryRequestDto } from './dto/get-daily-summary.request.dto';

@Controller('tenants/:tenantId/establishments/:establishmentId/dashboard')
export class DashboardController {
  constructor(private readonly getDailySummary: GetDailySummaryUseCase) {}

  @Get('summary')
  @Auth('dashboard:read')
  async summary(
    @Param('establishmentId') establishmentId: string,
    @Query() query: GetDailySummaryRequestDto,
  ) {
    const date = query.date ?? new Date().toISOString().slice(0, 10);
    return this.getDailySummary.execute(establishmentId, date);
  }
}
