import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../auth/presentation/decorators/current-tenant.decorator';
import { AuthenticatedUser, TenantContext } from '../../auth/domain/request-context.types';
import { JoinWaitlistUseCase } from '../application/use-cases/join-waitlist.use-case';
import { ListWaitlistUseCase } from '../application/use-cases/list-waitlist.use-case';
import { CancelWaitlistEntryUseCase } from '../application/use-cases/cancel-waitlist-entry.use-case';
import { JoinWaitlistRequestDto } from './dto/join-waitlist.request.dto';
import { ListWaitlistRequestDto } from './dto/list-waitlist.request.dto';
import { WaitlistEntry } from '../domain/entities/waitlist-entry.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/waitlist')
export class WaitlistController {
  constructor(
    private readonly joinWaitlist: JoinWaitlistUseCase,
    private readonly listWaitlist: ListWaitlistUseCase,
    private readonly cancelWaitlistEntry: CancelWaitlistEntryUseCase,
  ) {}

  @Post()
  @Auth('waitlist:manage', 'waitlist:create:own')
  @HttpCode(HttpStatus.CREATED)
  async join(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: JoinWaitlistRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const isStaff = tenant.permissions.has('waitlist:manage');
    if (isStaff && !dto.clientId) {
      throw new BadRequestException('clientId é obrigatório ao inscrever um cliente na fila');
    }
    const clientId = isStaff ? dto.clientId! : user.id;

    const entry = await this.joinWaitlist.execute({
      establishmentId,
      clientId,
      serviceId: dto.serviceId,
      employeeId: dto.employeeId,
      desiredDate: new Date(`${dto.desiredDate}T00:00:00.000Z`),
      desiredPeriod: dto.desiredPeriod,
    });
    return this.toResponse(entry);
  }

  @Get()
  @Auth('waitlist:manage', 'waitlist:read:own')
  async list(
    @Param('establishmentId') establishmentId: string,
    @Query() query: ListWaitlistRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const entries = await this.listWaitlist.execute({
      establishmentId,
      actingUserId: user.id,
      isStaff: tenant.permissions.has('waitlist:manage'),
      filters: { clientId: query.clientId, status: query.status },
    });
    return entries.map((entry) => this.toResponse(entry));
  }

  @Delete(':entryId')
  @Auth('waitlist:manage', 'waitlist:cancel:own')
  async cancel(
    @Param('establishmentId') establishmentId: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const entry = await this.cancelWaitlistEntry.execute({
      establishmentId,
      entryId,
      actingUserId: user.id,
      isStaff: tenant.permissions.has('waitlist:manage'),
    });
    return this.toResponse(entry);
  }

  private toResponse(entry: WaitlistEntry) {
    return {
      id: entry.id,
      establishmentId: entry.establishmentId,
      clientId: entry.clientId,
      serviceId: entry.serviceId,
      employeeId: entry.employeeId,
      desiredDate: entry.desiredDate,
      desiredPeriod: entry.desiredPeriod,
      status: entry.status,
    };
  }
}
