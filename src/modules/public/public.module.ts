import { Module } from '@nestjs/common';
import { EstablishmentsModule } from '../establishments/establishments.module';
import { ServicesModule } from '../services/services.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { UsersModule } from '../users/users.module';
import { EmployeesModule } from '../employees/employees.module';
import { PublicController } from './presentation/public.controller';
import { ClientsModule } from '../clients/clients.module';
import { MeController } from './presentation/me.controller';
import { ListMyAppointmentsUseCase } from './application/use-cases/list-my-appointments.use-case';

// The client-facing surface: a read-only façade over existing use-cases for anonymous browsing,
// plus the signed-in client's own cross-establishment booking history.
@Module({
  imports: [
    EstablishmentsModule,
    ServicesModule,
    AppointmentsModule,
    ReviewsModule,
    UsersModule,
    EmployeesModule,
    ClientsModule,
  ],
  controllers: [PublicController, MeController],
  providers: [ListMyAppointmentsUseCase],
})
export class PublicModule {}
