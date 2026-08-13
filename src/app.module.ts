import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './shared-kernel/infrastructure/prisma.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EstablishmentsModule } from './modules/establishments/establishments.module';
import { UsersModule } from './modules/users/users.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { ClientsModule } from './modules/clients/clients.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ServicesModule } from './modules/services/services.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AgendaBlocksModule } from './modules/agenda-blocks/agenda-blocks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PublicModule } from './modules/public/public.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TenantsModule,
    EstablishmentsModule,
    UsersModule,
    RbacModule,
    ClientsModule,
    EmployeesModule,
    ServicesModule,
    AppointmentsModule,
    AgendaBlocksModule,
    NotificationsModule,
    PaymentsModule,
    DashboardModule,
    WaitlistModule,
    CouponsModule,
    ReviewsModule,
    ReportsModule,
    PublicModule,
    ApiKeysModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
