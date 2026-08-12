import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { ListClientsUseCase, ClientListItem } from '../application/use-cases/list-clients.use-case';
import { UpdateClientProfileUseCase } from '../application/use-cases/update-client-profile.use-case';
import {
  ResolveOrCreateClientUseCase,
  ResolveOrCreateClientOutput,
} from '../application/use-cases/resolve-or-create-client.use-case';
import { UpdateClientProfileRequestDto } from './dto/update-client-profile.request.dto';
import { CreateClientRequestDto } from './dto/create-client.request.dto';
import { ClientProfile } from '../domain/entities/client-profile.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/clients')
export class ClientsController {
  constructor(
    private readonly listClients: ListClientsUseCase,
    private readonly updateClientProfile: UpdateClientProfileUseCase,
    private readonly resolveOrCreateClient: ResolveOrCreateClientUseCase,
  ) {}

  @Get()
  @Auth('client:read')
  async list(@Param('establishmentId') establishmentId: string) {
    const items = await this.listClients.execute(establishmentId);
    return items.map((item) => this.toListResponse(item));
  }

  @Post()
  @Auth('client:create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: CreateClientRequestDto,
  ) {
    const result = await this.resolveOrCreateClient.execute({
      establishmentId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      birthDate: dto.birthDate ? new Date(`${dto.birthDate}T00:00:00.000Z`) : undefined,
      notes: dto.notes,
    });
    return this.toCreateResponse(result);
  }

  @Patch(':clientId')
  @Auth('client:update')
  async update(
    @Param('establishmentId') establishmentId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateClientProfileRequestDto,
  ) {
    const profile = await this.updateClientProfile.execute({
      establishmentId,
      clientId,
      phone: dto.phone !== undefined ? dto.phone || null : undefined,
      birthDate: dto.birthDate !== undefined ? new Date(`${dto.birthDate}T00:00:00.000Z`) : undefined,
      notes: dto.notes !== undefined ? dto.notes || null : undefined,
    });
    return this.toProfileResponse(profile);
  }

  private toListResponse(item: ClientListItem) {
    return {
      id: item.id,
      userId: item.userId,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      birthDate: item.birthDate,
      notes: item.notes,
    };
  }

  private toCreateResponse(result: ResolveOrCreateClientOutput) {
    return {
      id: result.clientProfileId,
      userId: result.userId,
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
      phone: result.phone,
      wasCreated: result.wasCreated,
    };
  }

  private toProfileResponse(profile: ClientProfile) {
    return {
      id: profile.id,
      establishmentId: profile.establishmentId,
      userId: profile.userId,
      phone: profile.phone,
      birthDate: profile.birthDate,
      notes: profile.notes,
    };
  }
}
