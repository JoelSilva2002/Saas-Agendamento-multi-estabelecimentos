import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PaymentsModule } from '../payments/payments.module';
import { GetMonthlyRevenueUseCase } from './application/use-cases/get-monthly-revenue.use-case';
import { GetTopServicesUseCase } from './application/use-cases/get-top-services.use-case';
import { GetEmployeeProductivityUseCase } from './application/use-cases/get-employee-productivity.use-case';
import { GetPeakHoursUseCase } from './application/use-cases/get-peak-hours.use-case';
import { ReportsController } from './presentation/reports.controller';

@Module({
  imports: [AppointmentsModule, PaymentsModule],
  controllers: [ReportsController],
  providers: [
    GetMonthlyRevenueUseCase,
    GetTopServicesUseCase,
    GetEmployeeProductivityUseCase,
    GetPeakHoursUseCase,
  ],
})
export class ReportsModule {}
