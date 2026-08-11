import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../auth/presentation/decorators/public.decorator';
import { EstablishmentRepositoryPort } from '../../establishments/domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../establishments/domain/errors/establishment-errors';
import { Establishment } from '../../establishments/domain/entities/establishment.entity';
import { ListServicesUseCase } from '../../services/application/use-cases/list-services.use-case';
import { ListEligibleEmployeesUseCase } from '../../services/application/use-cases/list-eligible-employees.use-case';
import { GetAvailableSlotsUseCase } from '../../appointments/application/use-cases/get-available-slots.use-case';
import { GetReviewSummaryUseCase } from '../../reviews/application/use-cases/get-review-summary.use-case';
import { UserRepositoryPort } from '../../users/domain/user.repository.port';
import { SearchEstablishmentsRequestDto } from './dto/search-establishments.request.dto';
import { PublicAvailabilityRequestDto } from './dto/public-availability.request.dto';

/**
 * Unauthenticated, client-facing surface: browse establishments by city, look at a catalogue,
 * and check availability — all before signing up. Booking itself is NOT here; it stays on the
 * authenticated `POST /tenants/:tenantId/establishments/:establishmentId/appointments`, which
 * derives the clientId from the token so a client can only ever book for themselves.
 *
 * Everything returned here is deliberately non-sensitive: no client data, no revenue, no
 * internal ids beyond what the booking flow needs to post back.
 */
@Public()
@Controller('public')
export class PublicController {
  constructor(
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly listServices: ListServicesUseCase,
    private readonly listEligibleEmployees: ListEligibleEmployeesUseCase,
    private readonly getAvailableSlots: GetAvailableSlotsUseCase,
    private readonly getReviewSummary: GetReviewSummaryUseCase,
    private readonly userRepository: UserRepositoryPort,
  ) {}

  @Get('cities')
  async cities() {
    return this.establishmentRepository.listCities();
  }

  @Get('establishments')
  async search(@Query() query: SearchEstablishmentsRequestDto) {
    const establishments = await this.establishmentRepository.findPublic({
      city: query.city,
      search: query.search,
    });
    return Promise.all(establishments.map((e) => this.toSummaryResponse(e)));
  }

  @Get('establishments/:slug')
  async detail(@Param('slug') slug: string) {
    const establishment = await this.resolveBySlug(slug);
    const summary = await this.getReviewSummary.execute(establishment.id);
    return {
      ...this.toBaseResponse(establishment),
      rating: { average: summary.average, count: summary.count },
      cancellationMinHoursNotice: establishment.cancellationMinHoursNotice,
    };
  }

  @Get('establishments/:slug/services')
  async services(@Param('slug') slug: string) {
    const establishment = await this.resolveBySlug(slug);
    const services = await this.listServices.execute(establishment.id, { status: 'active' });
    return services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      // Reais, matching ServicesController.toResponse — the client UI never sees cents.
      price: service.priceCents / 100,
      durationMinutes: service.durationMinutes,
      categoryId: service.categoryId,
    }));
  }

  @Get('establishments/:slug/services/:serviceId/employees')
  async employees(@Param('slug') slug: string, @Param('serviceId') serviceId: string) {
    const establishment = await this.resolveBySlug(slug);
    const employees = await this.listEligibleEmployees.execute({
      establishmentId: establishment.id,
      serviceId,
    });

    // Clients pick a person, not a job title — resolve the display name here rather than
    // making the public page fetch the tenant's user list (which it must not be able to do).
    return Promise.all(
      employees.map(async (employee) => {
        const user = await this.userRepository.findById(employee.userId);
        const name = user ? `${user.firstName} ${user.lastName}`.trim() : employee.jobTitle;
        return { id: employee.id, name, jobTitle: employee.jobTitle };
      }),
    );
  }

  @Get('establishments/:slug/availability')
  async availability(
    @Param('slug') slug: string,
    @Query() query: PublicAvailabilityRequestDto,
  ) {
    const establishment = await this.resolveBySlug(slug);
    const slots = await this.getAvailableSlots.execute({
      establishmentId: establishment.id,
      serviceId: query.serviceId,
      employeeId: query.employeeId,
      date: query.date,
      now: new Date(),
    });
    return slots.map((slot) => ({ startAt: slot.startAt, endAt: slot.endAt }));
  }

  private async resolveBySlug(slug: string): Promise<Establishment> {
    const establishment = await this.establishmentRepository.findBySlug(slug);
    if (!establishment) {
      throw new EstablishmentNotFoundError(slug);
    }
    return establishment;
  }

  /** tenantId/establishmentId are included because the booking flow has to post back to the
   * tenant-scoped appointment route once the client signs in. */
  private toBaseResponse(establishment: Establishment) {
    return {
      tenantId: establishment.tenantId,
      establishmentId: establishment.id,
      name: establishment.name,
      slug: establishment.slug,
      timezone: establishment.timezone,
      address: establishment.address,
      phones: establishment.phones,
    };
  }

  private async toSummaryResponse(establishment: Establishment) {
    const summary = await this.getReviewSummary.execute(establishment.id);
    return {
      ...this.toBaseResponse(establishment),
      rating: { average: summary.average, count: summary.count },
    };
  }
}
