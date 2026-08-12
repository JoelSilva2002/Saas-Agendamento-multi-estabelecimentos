import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CreateEstablishmentUseCase } from '../application/use-cases/create-establishment.use-case';
import { GetEstablishmentUseCase } from '../application/use-cases/get-establishment.use-case';
import { ListEstablishmentsUseCase } from '../application/use-cases/list-establishments.use-case';
import { UpdateEstablishmentUseCase } from '../application/use-cases/update-establishment.use-case';
import { DeleteEstablishmentUseCase } from '../application/use-cases/delete-establishment.use-case';
import { SetBusinessHoursUseCase } from '../application/use-cases/set-business-hours.use-case';
import { GetBusinessHoursUseCase } from '../application/use-cases/get-business-hours.use-case';
import { CreateEstablishmentRequestDto } from './dto/create-establishment.request.dto';
import { UpdateEstablishmentRequestDto } from './dto/update-establishment.request.dto';
import { SetBusinessHoursRequestDto } from './dto/set-business-hours.request.dto';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { Establishment } from '../domain/entities/establishment.entity';
import { BusinessHoursDay } from '../domain/entities/business-hours-day.entity';

@Controller('tenants/:tenantId/establishments')
export class EstablishmentsController {
  constructor(
    private readonly createEstablishment: CreateEstablishmentUseCase,
    private readonly getEstablishment: GetEstablishmentUseCase,
    private readonly listEstablishments: ListEstablishmentsUseCase,
    private readonly updateEstablishment: UpdateEstablishmentUseCase,
    private readonly deleteEstablishment: DeleteEstablishmentUseCase,
    private readonly setBusinessHours: SetBusinessHoursUseCase,
    private readonly getBusinessHours: GetBusinessHoursUseCase,
  ) {}

  @Post()
  @Auth('establishment:create')
  async create(@Param('tenantId') tenantId: string, @Body() dto: CreateEstablishmentRequestDto) {
    const establishment = await this.createEstablishment.execute({ tenantId, ...dto });
    return this.toResponse(establishment);
  }

  @Get()
  @Auth('establishment:read')
  async list(@Param('tenantId') tenantId: string) {
    const establishments = await this.listEstablishments.execute(tenantId);
    return establishments.map((establishment) => this.toResponse(establishment));
  }

  @Get(':establishmentId')
  @Auth('establishment:read')
  async getOne(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
  ) {
    const establishment = await this.getEstablishment.execute({ tenantId, establishmentId });
    return this.toResponse(establishment);
  }

  @Patch(':establishmentId')
  @Auth('establishment:update')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
    @Body() dto: UpdateEstablishmentRequestDto,
  ) {
    const establishment = await this.updateEstablishment.execute({
      tenantId,
      establishmentId,
      ...dto,
    });
    return this.toResponse(establishment);
  }

  @Delete(':establishmentId')
  @Auth('establishment:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
  ) {
    await this.deleteEstablishment.execute({ tenantId, establishmentId });
  }

  @Get(':establishmentId/business-hours')
  @Auth('establishment:read')
  async getHours(@Param('establishmentId') establishmentId: string) {
    const days = await this.getBusinessHours.execute(establishmentId);
    return days.map((day) => this.toHoursResponse(day));
  }

  @Put(':establishmentId/business-hours')
  @Auth('establishment:update')
  async putHours(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
    @Body() dto: SetBusinessHoursRequestDto,
  ) {
    const days = await this.setBusinessHours.execute({ tenantId, establishmentId, days: dto.days });
    return days.map((day) => this.toHoursResponse(day));
  }

  private toResponse(establishment: Establishment) {
    return {
      id: establishment.id,
      tenantId: establishment.tenantId,
      name: establishment.name,
      slug: establishment.slug,
      description: establishment.description,
      timezone: establishment.timezone,
      address: establishment.address,
      phones: establishment.phones,
      cancellationMinHoursNotice: establishment.cancellationMinHoursNotice,
      noShowFeeEnabled: establishment.noShowFeeEnabled,
      noShowFeePercentage: establishment.noShowFeePercentage,
      depositEnabled: establishment.depositEnabled,
      depositPercentage: establishment.depositPercentage,
      reminder24hEnabled: establishment.reminder24hEnabled,
      reminder2hEnabled: establishment.reminder2hEnabled,
      notifyEmailEnabled: establishment.notifyEmailEnabled,
      notifyWhatsappEnabled: establishment.notifyWhatsappEnabled,
    };
  }

  private toHoursResponse(day: BusinessHoursDay) {
    return {
      weekday: day.weekday,
      isClosed: day.isClosed,
      openTime: day.openTime,
      closeTime: day.closeTime,
    };
  }
}
