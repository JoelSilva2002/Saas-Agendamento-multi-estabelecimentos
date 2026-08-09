import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { GetAvailableSlotsUseCase } from '../application/use-cases/get-available-slots.use-case';
import { CreateAppointmentUseCase } from '../application/use-cases/create-appointment.use-case';
import { GetAvailableSlotsRequestDto } from './dto/get-available-slots.request.dto';
import { CreateAppointmentRequestDto } from './dto/create-appointment.request.dto';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/domain/request-context.types';
import { AvailableSlot } from '../domain/services/availability-calculator.service';
import { Appointment } from '../domain/entities/appointment.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId')
export class AppointmentsController {
  constructor(
    private readonly getAvailableSlots: GetAvailableSlotsUseCase,
    private readonly createAppointment: CreateAppointmentUseCase,
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
      now: new Date(),
    });
    return slots.map((slot) => this.toSlotResponse(slot));
  }

  @Post('appointments')
  @Auth('appointment:create')
  @HttpCode(HttpStatus.CREATED)
  async book(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: CreateAppointmentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const appointment = await this.createAppointment.execute({
      establishmentId,
      clientId: dto.clientId,
      employeeId: dto.employeeId,
      serviceId: dto.serviceId,
      startAt: new Date(dto.startAt),
      isFitIn: dto.isFitIn,
      createdById: user.id,
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
    };
  }
}
