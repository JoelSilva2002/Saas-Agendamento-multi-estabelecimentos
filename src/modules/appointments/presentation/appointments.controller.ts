import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/configuration';
import { GetAvailableSlotsUseCase } from '../application/use-cases/get-available-slots.use-case';
import { CreateAppointmentUseCase } from '../application/use-cases/create-appointment.use-case';
import { CancelAppointmentUseCase } from '../application/use-cases/cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from '../application/use-cases/reschedule-appointment.use-case';
import { MarkNoShowUseCase } from '../application/use-cases/mark-no-show.use-case';
import { GetAppointmentUseCase } from '../application/use-cases/get-appointment.use-case';
import { ListAppointmentsUseCase } from '../application/use-cases/list-appointments.use-case';
import { CompleteAppointmentUseCase } from '../application/use-cases/complete-appointment.use-case';
import { CheckInAppointmentUseCase } from '../application/use-cases/check-in-appointment.use-case';
import { ExportAppointmentsUseCase } from '../application/use-cases/export-appointments.use-case';
import { GetAvailableSlotsRequestDto } from './dto/get-available-slots.request.dto';
import { CreateAppointmentRequestDto } from './dto/create-appointment.request.dto';
import { CancelAppointmentRequestDto } from './dto/cancel-appointment.request.dto';
import { RescheduleAppointmentRequestDto } from './dto/reschedule-appointment.request.dto';
import { ListAppointmentsRequestDto } from './dto/list-appointments.request.dto';
import { CheckInAppointmentRequestDto } from './dto/check-in-appointment.request.dto';
import { ExportAppointmentsRequestDto } from './dto/export-appointments.request.dto';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../auth/presentation/decorators/current-tenant.decorator';
import { AuthenticatedUser, TenantContext } from '../../auth/domain/request-context.types';
import { AvailableSlot } from '../domain/services/availability-calculator.service';
import { Appointment } from '../domain/entities/appointment.entity';
import { computeCheckInToken } from '../domain/services/checkin-token.util';
import { CsvAppointmentFormatter } from './formatters/csv-appointment.formatter';
import { PdfAppointmentFormatter } from './formatters/pdf-appointment.formatter';

@Controller('tenants/:tenantId/establishments/:establishmentId')
export class AppointmentsController {
  constructor(
    private readonly getAvailableSlots: GetAvailableSlotsUseCase,
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
    private readonly rescheduleAppointment: RescheduleAppointmentUseCase,
    private readonly markNoShow: MarkNoShowUseCase,
    private readonly getAppointment: GetAppointmentUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly completeAppointment: CompleteAppointmentUseCase,
    private readonly checkInAppointment: CheckInAppointmentUseCase,
    private readonly exportAppointments: ExportAppointmentsUseCase,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @Get('availability')
  @Auth('service:read')
  async listAvailability(
    @Param('establishmentId') establishmentId: string,
    @Query() query: GetAvailableSlotsRequestDto,
  ) {
    const slots = await this.getAvailableSlots.execute({
      establishmentId,
      serviceId: query.serviceId,
      employeeId: query.employeeId,
      date: query.date,
      slotIntervalMinutes: query.slotIntervalMinutes,
      excludeAppointmentId: query.excludeAppointmentId,
      now: new Date(),
    });
    return slots.map((slot) => this.toSlotResponse(slot));
  }

  @Post('appointments')
  @Auth('appointment:create', 'appointment:create:own')
  @HttpCode(HttpStatus.CREATED)
  async book(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: CreateAppointmentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext,
  ) {
    // A caller without the broad `appointment:create` (staff) permission only has
    // `appointment:create:own` — their clientId is never taken from the body, it's always
    // themselves. This is the only defense against a client booking on behalf of someone
    // else, so it stays here rather than trusting dto.clientId.
    const isStaff = tenant.permissions.has('appointment:create');
    if (isStaff && !dto.clientId) {
      throw new BadRequestException('clientId é obrigatório ao agendar em nome de um cliente');
    }
    const clientId = isStaff ? dto.clientId! : user.id;

    const appointment = await this.createAppointment.execute({
      establishmentId,
      clientId,
      employeeId: dto.employeeId,
      serviceId: dto.serviceId,
      startAt: new Date(dto.startAt),
      isFitIn: dto.isFitIn,
      createdById: user.id,
    });
    return this.toAppointmentResponse(appointment);
  }

  @Get('appointments')
  @Auth('appointment:read', 'appointment:read:own')
  async list(
    @Param('establishmentId') establishmentId: string,
    @Query() query: ListAppointmentsRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const appointments = await this.listAppointments.execute({
      establishmentId,
      actingUserId: user.id,
      isStaff: tenant.permissions.has('appointment:read'),
      filters: {
        clientId: query.clientId,
        employeeId: query.employeeId,
        status: query.status,
        fromDate: query.fromDate,
        toDate: query.toDate,
      },
    });
    return appointments.map((appointment) => this.toAppointmentResponse(appointment));
  }

  // Must be declared before `appointments/:appointmentId` — Nest/Express matches routes in
  // declaration order for the same method, so a static segment ("export") needs to come
  // before the dynamic one or it gets swallowed as an :appointmentId value.
  @Get('appointments/export')
  @Auth('appointment:read')
  async export(
    @Param('establishmentId') establishmentId: string,
    @Query() query: ExportAppointmentsRequestDto,
    @Res() res: Response,
  ) {
    const appointments = await this.exportAppointments.execute({
      establishmentId,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    if (query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="agenda.csv"');
      res.send(CsvAppointmentFormatter.format(appointments));
      return;
    }

    const pdf = await PdfAppointmentFormatter.format(appointments);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="agenda.pdf"');
    res.send(pdf);
  }

  @Get('appointments/:appointmentId')
  @Auth('appointment:read', 'appointment:read:own')
  async getOne(
    @Param('establishmentId') establishmentId: string,
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const appointment = await this.getAppointment.execute({
      establishmentId,
      appointmentId,
      actingUserId: user.id,
      isStaff: tenant.permissions.has('appointment:read'),
    });
    return this.toAppointmentResponse(appointment);
  }

  @Patch('appointments/:appointmentId/cancel')
  @Auth('appointment:update', 'appointment:cancel:own')
  async cancel(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CancelAppointmentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const appointment = await this.cancelAppointment.execute({
      tenantId,
      establishmentId,
      appointmentId,
      reason: dto.reason,
      actingUserId: user.id,
      isStaff: tenant.permissions.has('appointment:update'),
    });
    return this.toAppointmentResponse(appointment);
  }

  @Patch('appointments/:appointmentId/reschedule')
  @Auth('appointment:update', 'appointment:reschedule:own')
  async reschedule(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: RescheduleAppointmentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const appointment = await this.rescheduleAppointment.execute({
      tenantId,
      establishmentId,
      appointmentId,
      newStartAt: new Date(dto.startAt),
      newEmployeeId: dto.employeeId,
      actingUserId: user.id,
      isStaff: tenant.permissions.has('appointment:update'),
    });
    return this.toAppointmentResponse(appointment);
  }

  @Patch('appointments/:appointmentId/no-show')
  @Auth('appointment:update')
  async markAsNoShow(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
    @Param('appointmentId') appointmentId: string,
  ) {
    const appointment = await this.markNoShow.execute({ tenantId, establishmentId, appointmentId });
    return this.toAppointmentResponse(appointment);
  }

  @Patch('appointments/:appointmentId/complete')
  @Auth('appointment:update')
  async complete(
    @Param('establishmentId') establishmentId: string,
    @Param('appointmentId') appointmentId: string,
  ) {
    const appointment = await this.completeAppointment.execute({ establishmentId, appointmentId });
    return this.toAppointmentResponse(appointment);
  }

  @Get('appointments/:appointmentId/checkin-token')
  @Auth('appointment:read', 'appointment:read:own')
  checkInToken(@Param('appointmentId') appointmentId: string) {
    const secret = this.configService.get('jwt', { infer: true }).accessSecret;
    return { appointmentId, token: computeCheckInToken(appointmentId, secret) };
  }

  @Post('appointments/:appointmentId/checkin')
  @Auth('appointment:update')
  async checkIn(
    @Param('establishmentId') establishmentId: string,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CheckInAppointmentRequestDto,
  ) {
    const appointment = await this.checkInAppointment.execute({
      establishmentId,
      appointmentId,
      token: dto.token,
    });
    return this.toAppointmentResponse(appointment);
  }

  private toSlotResponse(slot: AvailableSlot) {
    return { startAt: slot.startAt, endAt: slot.endAt };
  }

  private toAppointmentResponse(appointment: Appointment) {
    return {
      id: appointment.id,
      establishmentId: appointment.establishmentId,
      clientId: appointment.clientId,
      employeeId: appointment.employeeId,
      serviceId: appointment.serviceId,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      priceCents: appointment.priceCents,
      isFitIn: appointment.isFitIn,
      cancellationReason: appointment.cancellationReason,
      cancelledAt: appointment.cancelledAt,
      cancelledById: appointment.cancelledById,
      noShowFeeCents: appointment.noShowFeeCents,
    };
  }
}
