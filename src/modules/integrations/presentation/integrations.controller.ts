import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { GetAvailableSlotsUseCase } from '../../appointments/application/use-cases/get-available-slots.use-case';
import { CreateAppointmentUseCase } from '../../appointments/application/use-cases/create-appointment.use-case';
import { ListAppointmentsUseCase } from '../../appointments/application/use-cases/list-appointments.use-case';
import { CancelAppointmentUseCase } from '../../appointments/application/use-cases/cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from '../../appointments/application/use-cases/reschedule-appointment.use-case';
import { AppointmentRepositoryPort } from '../../appointments/domain/appointment.repository.port';
import { Appointment } from '../../appointments/domain/entities/appointment.entity';
import { AvailableSlot } from '../../appointments/domain/services/availability-calculator.service';
import { ListServicesUseCase } from '../../services/application/use-cases/list-services.use-case';
import { ServiceRepositoryPort } from '../../services/domain/service.repository.port';
import { ListEmployeesUseCase } from '../../employees/application/use-cases/list-employees.use-case';
import { EmployeeRepositoryPort } from '../../employees/domain/employee.repository.port';
import { UserRepositoryPort } from '../../users/domain/user.repository.port';
import { ResolveOrCreateClientUseCase } from '../../clients/application/use-cases/resolve-or-create-client.use-case';
import { CurrentTenant } from '../../auth/presentation/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser, TenantContext } from '../../auth/domain/request-context.types';
import { IntegrationAuth } from './decorators/integration-auth.decorator';
import { ListAvailabilityRequestDto } from './dto/list-availability.request.dto';
import { ListIntegrationAppointmentsRequestDto } from './dto/list-integration-appointments.request.dto';
import {
  CreateIntegrationAppointmentRequestDto,
} from './dto/create-integration-appointment.request.dto';
import { CancelIntegrationAppointmentRequestDto } from './dto/cancel-integration-appointment.request.dto';
import { RescheduleIntegrationAppointmentRequestDto } from './dto/reschedule-integration-appointment.request.dto';

// Machine-to-machine API for an establishment's own automation (Fase 24) — e.g. a WhatsApp
// bot querying availability and booking/cancelling/rescheduling appointments. Establishment
// (and tenant) come from the API key via IntegrationAuthGuard, never from the URL — there is
// deliberately no :establishmentId segment here.
@Controller('integrations/v1')
export class IntegrationsController {
  constructor(
    private readonly getAvailableSlots: GetAvailableSlotsUseCase,
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
    private readonly rescheduleAppointment: RescheduleAppointmentUseCase,
    private readonly listServices: ListServicesUseCase,
    private readonly listEmployees: ListEmployeesUseCase,
    private readonly resolveOrCreateClient: ResolveOrCreateClientUseCase,
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly appointmentRepository: AppointmentRepositoryPort,
  ) {}

  @Get('services')
  @IntegrationAuth('appointment:read')
  async services(@CurrentTenant() tenant: TenantContext) {
    const services = await this.listServices.execute(tenant.establishmentId!);
    return services.map((service) => ({
      id: service.id,
      name: service.name,
      priceCents: service.priceCents,
      durationMinutes: service.durationMinutes,
    }));
  }

  @Get('employees')
  @IntegrationAuth('appointment:read')
  async employees(@CurrentTenant() tenant: TenantContext) {
    const employees = await this.listEmployees.execute(tenant.establishmentId!);
    const names = await this.resolveUserNames(employees.map((employee) => employee.userId));
    return employees.map((employee) => ({
      id: employee.id,
      name: names.get(employee.userId) ?? employee.jobTitle,
      jobTitle: employee.jobTitle,
    }));
  }

  @Get('availability')
  @IntegrationAuth('appointment:read')
  async availability(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListAvailabilityRequestDto,
  ) {
    const slots = await this.getAvailableSlots.execute({
      establishmentId: tenant.establishmentId!,
      serviceId: query.serviceId,
      employeeId: query.employeeId,
      date: query.date,
      slotIntervalMinutes: query.slotIntervalMinutes,
      now: new Date(),
    });
    return slots.map((slot: AvailableSlot) => ({ startAt: slot.startAt, endAt: slot.endAt }));
  }

  @Get('appointments')
  @IntegrationAuth('appointment:read')
  async appointments(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListIntegrationAppointmentsRequestDto,
  ) {
    const appointments = await this.listAppointments.execute({
      establishmentId: tenant.establishmentId!,
      actingUserId: user.id,
      isStaff: true,
      filters: { status: query.status, fromDate: query.fromDate, toDate: query.toDate },
    });
    return this.toAppointmentResponses(tenant.establishmentId!, appointments);
  }

  @Post('appointments')
  @IntegrationAuth('appointment:create')
  async createAppointmentEndpoint(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIntegrationAppointmentRequestDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    // A bot that times out and retries the exact same booking must get the original
    // appointment back, not a duplicate — checked first so the common retry case never even
    // touches ResolveOrCreateClientUseCase/CreateAppointmentUseCase. A second check happens
    // at the DB layer (see PrismaAppointmentRepository.createIfAvailable) to close the race
    // where two retries with the same key arrive concurrently.
    if (idempotencyKey) {
      const existing = await this.appointmentRepository.findByIdempotencyKey(
        tenant.establishmentId!,
        idempotencyKey,
      );
      if (existing) {
        res.status(HttpStatus.OK);
        return this.toAppointmentResponses(tenant.establishmentId!, [existing]).then((r) => r[0]);
      }
    }

    let clientId = dto.clientId;
    if (!clientId) {
      if (!dto.client) {
        throw new BadRequestException('Informe clientId ou client (firstName, phone/email)');
      }
      const resolved = await this.resolveOrCreateClient.execute({
        establishmentId: tenant.establishmentId!,
        firstName: dto.client.firstName,
        lastName: dto.client.lastName,
        email: dto.client.email,
        phone: dto.client.phone,
      });
      clientId = resolved.userId;
    }

    const appointment = await this.createAppointment.execute({
      establishmentId: tenant.establishmentId!,
      clientId,
      employeeId: dto.employeeId,
      serviceId: dto.serviceId,
      startAt: new Date(dto.startAt),
      // Forced always — an integration key must never bypass the overlap check the way the
      // admin's deliberate Encaixe flow does (see Fase 23 plan's security notes).
      isFitIn: false,
      idempotencyKey,
      // request.user.id is the ApiKey's createdById (set by IntegrationAuthGuard) — a real
      // users.id, satisfying Appointment.createdById's FK constraint.
      createdById: user.id,
    });
    res.status(HttpStatus.CREATED);
    return this.toAppointmentResponses(tenant.establishmentId!, [appointment]).then((r) => r[0]);
  }

  @Patch('appointments/:appointmentId/cancel')
  @IntegrationAuth('appointment:update')
  async cancel(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CancelIntegrationAppointmentRequestDto,
  ) {
    const appointment = await this.cancelAppointment.execute({
      tenantId: tenant.tenantId,
      establishmentId: tenant.establishmentId!,
      appointmentId,
      reason: dto.reason,
      actingUserId: user.id,
      isStaff: true,
    });
    return this.toAppointmentResponses(tenant.establishmentId!, [appointment]).then((r) => r[0]);
  }

  @Patch('appointments/:appointmentId/reschedule')
  @IntegrationAuth('appointment:update')
  async reschedule(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: RescheduleIntegrationAppointmentRequestDto,
  ) {
    const appointment = await this.rescheduleAppointment.execute({
      tenantId: tenant.tenantId,
      establishmentId: tenant.establishmentId!,
      appointmentId,
      newStartAt: new Date(dto.startAt),
      newEmployeeId: dto.employeeId,
      actingUserId: user.id,
      isStaff: true,
    });
    return this.toAppointmentResponses(tenant.establishmentId!, [appointment]).then((r) => r[0]);
  }

  private async resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(userIds)];
    const users = await Promise.all(uniqueIds.map((id) => this.userRepository.findById(id)));
    const names = new Map<string, string>();
    users.forEach((user, index) => {
      if (user) {
        names.set(uniqueIds[index], `${user.firstName} ${user.lastName}`.trim());
      }
    });
    return names;
  }

  // Every response carries resolved names (service, professional, client), not just ids — a
  // bot building a WhatsApp message has no use for a bare UUID.
  private async toAppointmentResponses(establishmentId: string, appointments: Appointment[]) {
    const serviceIds = [...new Set(appointments.map((a) => a.serviceId))];
    const employeeIds = [...new Set(appointments.map((a) => a.employeeId))];

    const [services, employees] = await Promise.all([
      Promise.all(serviceIds.map((id) => this.serviceRepository.findById(id, establishmentId))),
      Promise.all(employeeIds.map((id) => this.employeeRepository.findById(id, establishmentId))),
    ]);

    const serviceNames = new Map<string, string>();
    services.forEach((service, index) => {
      if (service) serviceNames.set(serviceIds[index], service.name);
    });

    const employeeUserIds = new Map<string, string>();
    employees.forEach((employee, index) => {
      if (employee) employeeUserIds.set(employeeIds[index], employee.userId);
    });

    const clientIds = [...new Set(appointments.map((a) => a.clientId))];
    const userIdsToResolve = [...new Set([...clientIds, ...employeeUserIds.values()])];
    const userNames = await this.resolveUserNames(userIdsToResolve);

    return appointments.map((appointment) => {
      const employeeUserId = employeeUserIds.get(appointment.employeeId);
      return {
        id: appointment.id,
        clientId: appointment.clientId,
        clientName: userNames.get(appointment.clientId) ?? null,
        employeeId: appointment.employeeId,
        employeeName: employeeUserId ? userNames.get(employeeUserId) ?? null : null,
        serviceId: appointment.serviceId,
        serviceName: serviceNames.get(appointment.serviceId) ?? null,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        priceCents: appointment.priceCents,
        cancellationReason: appointment.cancellationReason,
        cancelledAt: appointment.cancelledAt,
      };
    });
  }
}
