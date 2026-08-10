import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PaymentRepositoryPort } from './domain/payment.repository.port';
import { PaymentGatewayPort } from './domain/payment-gateway.port';
import { PrismaPaymentRepository } from './infrastructure/persistence/prisma-payment.repository';
import { HttpPaymentGatewayAdapter } from './infrastructure/gateway/http-payment-gateway.adapter';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case';
import { MarkPaymentPaidUseCase } from './application/use-cases/mark-payment-paid.use-case';
import { ConfirmPaymentWebhookUseCase } from './application/use-cases/confirm-payment-webhook.use-case';
import { GetPaymentUseCase } from './application/use-cases/get-payment.use-case';
import { ListPaymentsUseCase } from './application/use-cases/list-payments.use-case';
import { PaymentsController } from './presentation/payments.controller';
import { PaymentsWebhookController } from './presentation/payments-webhook.controller';

@Module({
  imports: [AppointmentsModule],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [
    { provide: PaymentRepositoryPort, useClass: PrismaPaymentRepository },
    { provide: PaymentGatewayPort, useClass: HttpPaymentGatewayAdapter },
    CreatePaymentUseCase,
    MarkPaymentPaidUseCase,
    ConfirmPaymentWebhookUseCase,
    GetPaymentUseCase,
    ListPaymentsUseCase,
  ],
  exports: [PaymentRepositoryPort],
})
export class PaymentsModule {}
