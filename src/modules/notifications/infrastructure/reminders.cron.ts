import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EstablishmentRepositoryPort } from '../../establishments/domain/establishment.repository.port';
import { DispatchDueRemindersUseCase } from '../application/use-cases/dispatch-due-reminders.use-case';

/** Every establishment's reminder scan runs independently — one establishment's failure
 * (e.g. a transient DB hiccup) never blocks the others in the same tick. */
@Injectable()
export class RemindersCron {
  private readonly logger = new Logger(RemindersCron.name);

  constructor(
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly dispatchDueReminders: DispatchDueRemindersUseCase,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    const establishments = await this.establishmentRepository.findAllActive();
    for (const establishment of establishments) {
      try {
        await this.dispatchDueReminders.execute(establishment);
      } catch (error) {
        this.logger.error(
          `Falha ao processar lembretes do estabelecimento '${establishment.id}'`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }
}
