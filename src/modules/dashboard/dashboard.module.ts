import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PaymentsModule } from '../payments/payments.module';
import { ClientsModule } from '../clients/clients.module';
import { EmployeesModule } from '../employees/employees.module';
import { EstablishmentsModule } from '../establishments/establishments.module';
import { GetDailySummaryUseCase } from './application/use-cases/get-daily-summary.use-case';
import { DashboardController } from './presentation/dashboard.controller';

@Module({
  imports: [
    AppointmentsModule,
    PaymentsModule,
    ClientsModule,
    EmployeesModule,
    EstablishmentsModule,
  ],
  controllers: [DashboardController],
  providers: [GetDailySummaryUseCase],
})
export class DashboardModule {}
