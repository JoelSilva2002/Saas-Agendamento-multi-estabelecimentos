import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CreateEstablishmentUseCase } from '../application/use-cases/create-establishment.use-case';
import { GetEstablishmentUseCase } from '../application/use-cases/get-establishment.use-case';
import { ListEstablishmentsUseCase } from '../application/use-cases/list-establishments.use-case';
import { UpdateEstablishmentUseCase } from '../application/use-cases/update-establishment.use-case';
import { DeleteEstablishmentUseCase } from '../application/use-cases/delete-establishment.use-case';
import { CreateEstablishmentRequestDto } from './dto/create-establishment.request.dto';
import { UpdateEstablishmentRequestDto } from './dto/update-establishment.request.dto';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { Establishment } from '../domain/entities/establishment.entity';

@Controller('tenants/:tenantId/establishments')
export class EstablishmentsController {
  constructor(
    private readonly createEstablishment: CreateEstablishmentUseCase,
    private readonly getEstablishment: GetEstablishmentUseCase,
    private readonly listEstablishments: ListEstablishmentsUseCase,
    private readonly updateEstablishment: UpdateEstablishmentUseCase,
    private readonly deleteEstablishment: DeleteEstablishmentUseCase,
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
  async getOne(@Param('tenantId') tenantId: string, @Param('establishmentId') establishmentId: string) {
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
    const establishment = await this.updateEstablishment.execute({ tenantId, establishmentId, ...dto });
    return this.toResponse(establishment);
  }

  @Delete(':establishmentId')
  @Auth('establishment:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('tenantId') tenantId: string, @Param('establishmentId') establishmentId: string) {
    await this.deleteEstablishment.execute({ tenantId, establishmentId });
  }

  private toResponse(establishment: Establishment) {
    return {
      id: establishment.id,
      tenantId: establishment.tenantId,
      name: establishment.name,
      slug: establishment.slug,
      timezone: establishment.timezone,
    };
  }
}
