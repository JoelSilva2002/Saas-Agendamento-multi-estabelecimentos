import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { WaitlistEntryRepositoryPort } from './domain/waitlist-entry.repository.port';
import { PrismaWaitlistEntryRepository } from './infrastructure/persistence/prisma-waitlist-entry.repository';
import { JoinWaitlistUseCase } from './application/use-cases/join-waitlist.use-case';
import { ListWaitlistUseCase } from './application/use-cases/list-waitlist.use-case';
import { CancelWaitlistEntryUseCase } from './application/use-cases/cancel-waitlist-entry.use-case';
import { AppointmentCancelledListener } from './application/listeners/appointment-cancelled.listener';
import { WaitlistController } from './presentation/waitlist.controller';

@Module({
  // Deliberately does NOT import AppointmentsModule — it only needs the event payload type
  // (a plain TS import from appointments/domain/events, not a Nest module import) plus its
  // own WaitlistEntryRepositoryPort to match candidates. No re-validation of real
  // availability happens here; the client still books through the normal flow.
  imports: [NotificationsModule, UsersModule],
  controllers: [WaitlistController],
  providers: [
    { provide: WaitlistEntryRepositoryPort, useClass: PrismaWaitlistEntryRepository },
    JoinWaitlistUseCase,
    ListWaitlistUseCase,
    CancelWaitlistEntryUseCase,
    AppointmentCancelledListener,
  ],
})
export class WaitlistModule {}
