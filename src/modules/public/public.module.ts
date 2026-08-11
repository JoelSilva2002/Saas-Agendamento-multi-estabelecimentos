import { Module } from '@nestjs/common';
import { EstablishmentsModule } from '../establishments/establishments.module';
import { ServicesModule } from '../services/services.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { UsersModule } from '../users/users.module';
import { PublicController } from './presentation/public.controller';

// Read-only, unauthenticated façade over existing use-cases — it owns no repositories or
// business rules of its own, only a narrower response shape safe to expose to anyone.
@Module({
  imports: [EstablishmentsModule, ServicesModule, AppointmentsModule, ReviewsModule, UsersModule],
  controllers: [PublicController],
})
export class PublicModule {}
