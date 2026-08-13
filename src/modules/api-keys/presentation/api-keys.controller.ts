import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Delete } from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/domain/request-context.types';
import { GenerateApiKeyUseCase } from '../application/use-cases/generate-api-key.use-case';
import { ListApiKeysUseCase } from '../application/use-cases/list-api-keys.use-case';
import { RevokeApiKeyUseCase } from '../application/use-cases/revoke-api-key.use-case';
import { CreateApiKeyRequestDto } from './dto/create-api-key.request.dto';
import { ApiKey } from '../domain/entities/api-key.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/api-keys')
export class ApiKeysController {
  constructor(
    private readonly generateApiKey: GenerateApiKeyUseCase,
    private readonly listApiKeys: ListApiKeysUseCase,
    private readonly revokeApiKey: RevokeApiKeyUseCase,
  ) {}

  @Get()
  @Auth('establishment:read')
  async list(@Param('establishmentId') establishmentId: string) {
    const items = await this.listApiKeys.execute(establishmentId);
    return items.map((item) => this.toResponse(item));
  }

  @Post()
  @Auth('establishment:update')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: CreateApiKeyRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.generateApiKey.execute({
      establishmentId,
      name: dto.name,
      createdById: user.id,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
    return {
      id: result.id,
      name: result.name,
      // Shown to the caller exactly once — the raw secret is never persisted or retrievable
      // again after this response.
      rawKey: result.rawKey,
      keyPrefix: result.keyPrefix,
      scopes: result.scopes,
      createdAt: result.createdAt,
    };
  }

  @Delete(':apiKeyId')
  @Auth('establishment:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param('establishmentId') establishmentId: string,
    @Param('apiKeyId') apiKeyId: string,
  ) {
    await this.revokeApiKey.execute(apiKeyId, establishmentId);
  }

  private toResponse(apiKey: ApiKey) {
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      revokedAt: apiKey.revokedAt,
      createdAt: apiKey.createdAt,
    };
  }
}
