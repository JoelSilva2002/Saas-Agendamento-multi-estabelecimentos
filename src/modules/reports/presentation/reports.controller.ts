import { Controller, Get, Param, Query } from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { GetMonthlyRevenueUseCase } from '../application/use-cases/get-monthly-revenue.use-case';
import { GetTopServicesUseCase } from '../application/use-cases/get-top-services.use-case';
import { GetEmployeeProductivityUseCase } from '../application/use-cases/get-employee-productivity.use-case';
import { GetPeakHoursUseCase } from '../application/use-cases/get-peak-hours.use-case';
import { MonthlyRevenueReportRequestDto } from './dto/monthly-revenue-report.request.dto';
import { DateRangeReportRequestDto } from './dto/date-range-report.request.dto';

@Controller('tenants/:tenantId/establishments/:establishmentId/reports')
export class ReportsController {
  constructor(
    private readonly getMonthlyRevenue: GetMonthlyRevenueUseCase,
    private readonly getTopServices: GetTopServicesUseCase,
    private readonly getEmployeeProductivity: GetEmployeeProductivityUseCase,
    private readonly getPeakHours: GetPeakHoursUseCase,
  ) {}

  @Get('revenue')
  @Auth('report:read')
  async revenue(
    @Param('establishmentId') establishmentId: string,
    @Query() query: MonthlyRevenueReportRequestDto,
  ) {
    return this.getMonthlyRevenue.execute(establishmentId, query.month);
  }

  @Get('top-services')
  @Auth('report:read')
  async topServices(
    @Param('establishmentId') establishmentId: string,
    @Query() query: DateRangeReportRequestDto,
  ) {
    return this.getTopServices.execute({
      establishmentId,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });
  }

  @Get('employee-productivity')
  @Auth('report:read')
  async employeeProductivity(
    @Param('establishmentId') establishmentId: string,
    @Query() query: DateRangeReportRequestDto,
  ) {
    return this.getEmployeeProductivity.execute({
      establishmentId,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });
  }

  @Get('peak-hours')
  @Auth('report:read')
  async peakHours(
    @Param('establishmentId') establishmentId: string,
    @Query() query: DateRangeReportRequestDto,
  ) {
    return this.getPeakHours.execute({
      establishmentId,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });
  }
}
