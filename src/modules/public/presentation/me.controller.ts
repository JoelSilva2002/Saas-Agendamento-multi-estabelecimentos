import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/domain/request-context.types';
import { EstablishmentRepositoryPort } from '../../establishments/domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../establishments/domain/errors/establishment-errors';
import { EnsureClientMembershipUseCase } from '../../clients/application/use-cases/ensure-client-membership.use-case';
import { ListMyAppointmentsUseCase } from '../application/use-cases/list-my-appointments.use-case';

/**
 * The signed-in client's own area, spanning every establishment they have used.
 *
 * Guarded by JwtAuthGuard alone, not @Auth(): the tenant-scoped permission guards need a
 * :tenantId in the path, and these routes are deliberately cross-tenant. Isolation comes from
 * the token instead — the user id is taken from it and never from the request.
 */
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(
    private readonly listMyAppointments: ListMyAppointmentsUseCase,
    private readonly ensureClientMembership: EnsureClientMembershipUseCase,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
  ) {}

  @Get('appointments')
  async listAppointments(@CurrentUser() user: AuthenticatedUser) {
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

  /**
   * Registers the caller as a client of this establishment, if they are not already.
   *
   * An account created from the login page has no tenant grant at all, so TenantScopeGuard
   * would 404 its first booking. The booking flow calls this first. Idempotent, so it is safe
   * to call on every booking rather than trying to detect whether the grant exists.
   */
  @Post('establishments/:slug/join')
  @HttpCode(HttpStatus.NO_CONTENT)
  async joinEstablishment(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const establishment = await this.establishmentRepository.findBySlug(slug);
    if (!establishment) {
      throw new EstablishmentNotFoundError(slug);
    }
    await this.ensureClientMembership.execute({
      userId: user.id,
      establishmentId: establishment.id,
    });
  }
}
