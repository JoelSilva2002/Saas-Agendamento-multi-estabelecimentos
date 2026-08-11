import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/domain/request-context.types';
import { ListMyAppointmentsUseCase } from '../application/use-cases/list-my-appointments.use-case';

/**
 * The signed-in client's own bookings, spanning every establishment they have used.
 *
 * Guarded by JwtAuthGuard alone, not @Auth(): the tenant-scoped permission guards need a
 * :tenantId in the path, and this view is deliberately cross-tenant. Isolation comes from the
 * token instead — the client id is taken from it and never from the request.
 */
@UseGuards(JwtAuthGuard)
@Controller('me/appointments')
export class MyAppointmentsController {
  constructor(private readonly listMyAppointments: ListMyAppointmentsUseCase) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const appointments = await this.listMyAppointments.execute(user.id);
    return appointments.map((appointment) => ({
      id: appointment.id,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      priceCents: appointment.priceCents,
      serviceName: appointment.serviceName,
      employeeName: appointment.employeeName,
      establishmentName: appointment.establishmentName,
      establishmentSlug: appointment.establishmentSlug,
      timeZone: appointment.timeZone,
    }));
  }
}
