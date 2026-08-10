import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { CreatePaymentUseCase } from '../application/use-cases/create-payment.use-case';
import { MarkPaymentPaidUseCase } from '../application/use-cases/mark-payment-paid.use-case';
import { GetPaymentUseCase } from '../application/use-cases/get-payment.use-case';
import { ListPaymentsUseCase } from '../application/use-cases/list-payments.use-case';
import { CreatePaymentRequestDto } from './dto/create-payment.request.dto';
import { ListPaymentsRequestDto } from './dto/list-payments.request.dto';
import { Payment } from '../domain/entities/payment.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/payments')
export class PaymentsController {
  constructor(
    private readonly createPayment: CreatePaymentUseCase,
    private readonly markPaymentPaid: MarkPaymentPaidUseCase,
    private readonly getPayment: GetPaymentUseCase,
    private readonly listPayments: ListPaymentsUseCase,
  ) {}

  @Post()
  @Auth('payment:manage')
  async create(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
    @Body() dto: CreatePaymentRequestDto,
  ) {
    const payment = await this.createPayment.execute({
      tenantId,
      establishmentId,
      appointmentId: dto.appointmentId,
      method: dto.method,
      paymentType: dto.paymentType,
    });
    return this.toResponse(payment);
  }

  @Get()
  @Auth('payment:read')
  async list(
    @Param('establishmentId') establishmentId: string,
    @Query() query: ListPaymentsRequestDto,
  ) {
    const payments = await this.listPayments.execute({
      establishmentId,
      filters: { appointmentId: query.appointmentId, status: query.status },
    });
    return payments.map((payment) => this.toResponse(payment));
  }

  @Get(':paymentId')
  @Auth('payment:read')
  async getOne(
    @Param('establishmentId') establishmentId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const payment = await this.getPayment.execute({ establishmentId, paymentId });
    return this.toResponse(payment);
  }

  @Patch(':paymentId/mark-paid')
  @Auth('payment:manage')
  async markPaid(
    @Param('establishmentId') establishmentId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const payment = await this.markPaymentPaid.execute({ establishmentId, paymentId });
    return this.toResponse(payment);
  }

  private toResponse(payment: Payment) {
    return {
      id: payment.id,
      establishmentId: payment.establishmentId,
      appointmentId: payment.appointmentId,
      method: payment.method,
      paymentType: payment.paymentType,
      status: payment.status,
      amountCents: payment.amountCents,
      externalReference: payment.externalReference,
      paidAt: payment.paidAt,
    };
  }
}
