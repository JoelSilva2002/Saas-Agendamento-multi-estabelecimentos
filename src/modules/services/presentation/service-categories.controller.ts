import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CreateServiceCategoryUseCase } from '../application/use-cases/create-service-category.use-case';
import { ListServiceCategoriesUseCase } from '../application/use-cases/list-service-categories.use-case';
import { UpdateServiceCategoryUseCase } from '../application/use-cases/update-service-category.use-case';
import { DeleteServiceCategoryUseCase } from '../application/use-cases/delete-service-category.use-case';
import { CreateServiceCategoryRequestDto } from './dto/create-service-category.request.dto';
import { UpdateServiceCategoryRequestDto } from './dto/update-service-category.request.dto';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { ServiceCategory } from '../domain/entities/service-category.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/service-categories')
export class ServiceCategoriesController {
  constructor(
    private readonly createCategory: CreateServiceCategoryUseCase,
    private readonly listCategories: ListServiceCategoriesUseCase,
    private readonly updateCategory: UpdateServiceCategoryUseCase,
    private readonly deleteCategory: DeleteServiceCategoryUseCase,
  ) {}

  @Post()
  @Auth('service:manage')
  async create(@Param('establishmentId') establishmentId: string, @Body() dto: CreateServiceCategoryRequestDto) {
    const category = await this.createCategory.execute({ establishmentId, ...dto });
    return this.toResponse(category);
  }

  @Get()
  @Auth('service:read')
  async list(@Param('establishmentId') establishmentId: string) {
    const categories = await this.listCategories.execute(establishmentId);
    return categories.map((category) => this.toResponse(category));
  }

  @Patch(':categoryId')
  @Auth('service:manage')
  async update(
    @Param('establishmentId') establishmentId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateServiceCategoryRequestDto,
  ) {
    const category = await this.updateCategory.execute({ establishmentId, categoryId, ...dto });
    return this.toResponse(category);
  }

  @Delete(':categoryId')
  @Auth('service:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('establishmentId') establishmentId: string, @Param('categoryId') categoryId: string) {
    await this.deleteCategory.execute({ establishmentId, categoryId });
  }

  private toResponse(category: ServiceCategory) {
    return {
      id: category.id,
      establishmentId: category.establishmentId,
      name: category.name,
      displayOrder: category.displayOrder,
    };
  }
}
