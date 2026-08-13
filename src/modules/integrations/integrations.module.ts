import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ServicesModule } from '../services/services.module';
import { EmployeesModule } from '../employees/employees.module';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { EstablishmentsModule } from '../establishments/establishments.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { IntegrationsController } from './presentation/integrations.controller';
import { IntegrationAuthGuard } from './presentation/guards/integration-auth.guard';
import { ApiKeyThrottlerGuard } from './presentation/guards/api-key-throttler.guard';

@Module({
  imports: [
    AppointmentsModule,
    ServicesModule,
    EmployeesModule,
    ClientsModule,
    UsersModule,
    EstablishmentsModule,
    ApiKeysModule,
    // Scoped to this module only (not applied globally) — 120 req/min per API key, tracked
    // via ApiKeyThrottlerGuard instead of the default per-IP tracker.
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }] }),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationAuthGuard, ApiKeyThrottlerGuard],
})
export class IntegrationsModule {}
