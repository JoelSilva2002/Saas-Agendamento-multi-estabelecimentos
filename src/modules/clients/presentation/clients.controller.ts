import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { ListClientsUseCase } from '../application/use-cases/list-clients.use-case';
import { UpdateClientProfileUseCase } from '../application/use-cases/update-client-profile.use-case';
import { UpdateClientProfileRequestDto } from './dto/update-client-profile.request.dto';
import { ClientProfile } from '../domain/entities/client-profile.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/clients')
export class ClientsController {
  constructor(
    private readonly listClients: ListClientsUseCase,
    private readonly updateClientProfile: UpdateClientProfileUseCase,
  ) {}

  @Get()
  @Auth('client:read')
  async list(@Param('establishmentId') establishmentId: string) {
    const profiles = await this.listClients.execute(establishmentId);
    return profiles.map((profile) => this.toResponse(profile));
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
    return this.toResponse(profile);
  }

  private toResponse(profile: ClientProfile) {
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
