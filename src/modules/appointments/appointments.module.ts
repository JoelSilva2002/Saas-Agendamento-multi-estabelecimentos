import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { ServicesModule } from '../services/services.module';
import { AppointmentRepositoryPort } from './domain/appointment.repository.port';
import { PrismaAppointmentRepository } from './infrastructure/persistence/prisma-appointment.repository';
import { GetAvailableSlotsUseCase } from './application/use-cases/get-available-slots.use-case';
import { CreateAppointmentUseCase } from './application/use-cases/create-appointment.use-case';
import { CancelAppointmentUseCase } from './application/use-cases/cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from './application/use-cases/reschedule-appointment.use-case';
import { MarkNoShowUseCase } from './application/use-cases/mark-no-show.use-case';
import { GetAppointmentUseCase } from './application/use-cases/get-appointment.use-case';
import { ListAppointmentsUseCase } from './application/use-cases/list-appointments.use-case';
import { CompleteAppointmentUseCase } from './application/use-cases/complete-appointment.use-case';
import { CheckInAppointmentUseCase } from './application/use-cases/check-in-appointment.use-case';
import { ExportAppointmentsUseCase } from './application/use-cases/export-appointments.use-case';
import { AppointmentsController } from './presentation/appointments.controller';

@Module({
  imports: [EmployeesModule, ServicesModule],
  controllers: [AppointmentsController],
  providers: [
    { provide: AppointmentRepositoryPort, useClass: PrismaAppointmentRepository },
    GetAvailableSlotsUseCase,
    CreateAppointmentUseCase,
    CancelAppointmentUseCase,
    RescheduleAppointmentUseCase,
    MarkNoShowUseCase,
    GetAppointmentUseCase,
    ListAppointmentsUseCase,
    CompleteAppointmentUseCase,
    CheckInAppointmentUseCase,
    ExportAppointmentsUseCase,
  ],
  exports: [AppointmentRepositoryPort],
})
export class AppointmentsModule {}
