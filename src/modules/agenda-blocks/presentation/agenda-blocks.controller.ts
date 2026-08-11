import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/domain/request-context.types';
import { CreateAgendaBlockUseCase } from '../application/use-cases/create-agenda-block.use-case';
import { ListAgendaBlocksUseCase } from '../application/use-cases/list-agenda-blocks.use-case';
import { DeleteAgendaBlockUseCase } from '../application/use-cases/delete-agenda-block.use-case';
import { CreateAgendaBlockRequestDto } from './dto/create-agenda-block.request.dto';
import { ListAgendaBlocksQueryDto } from './dto/list-agenda-blocks.query.dto';
import { AgendaBlock } from '../domain/entities/agenda-block.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/agenda-blocks')
export class AgendaBlocksController {
  constructor(
    private readonly createAgendaBlock: CreateAgendaBlockUseCase,
    private readonly listAgendaBlocks: ListAgendaBlocksUseCase,
    private readonly deleteAgendaBlock: DeleteAgendaBlockUseCase,
  ) {}

  @Post()
  @Auth('agenda:block')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: CreateAgendaBlockRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const block = await this.createAgendaBlock.execute({
      establishmentId,
      employeeId: dto.employeeId,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      reason: dto.reason,
      createdById: user.id,
    });
    return this.toResponse(block);
  }

  @Get()
  @Auth('appointment:read')
  async list(@Param('establishmentId') establishmentId: string, @Query() query: ListAgendaBlocksQueryDto) {
    const blocks = await this.listAgendaBlocks.execute({
      establishmentId,
      filters: { employeeId: query.employeeId, fromDate: query.fromDate, toDate: query.toDate },
    });
    return blocks.map((block) => this.toResponse(block));
  }

  @Delete(':blockId')
  @Auth('agenda:block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('establishmentId') establishmentId: string, @Param('blockId') blockId: string) {
    await this.deleteAgendaBlock.execute({ establishmentId, blockId });
  }

  private toResponse(block: AgendaBlock) {
    return {
      id: block.id,
      establishmentId: block.establishmentId,
      employeeId: block.employeeId,
      startAt: block.startAt,
      endAt: block.endAt,
      reason: block.reason,
      createdById: block.createdById,
    };
  }
}
