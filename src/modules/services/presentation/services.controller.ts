import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { CreateServiceUseCase } from '../application/use-cases/create-service.use-case';
import { GetServiceUseCase } from '../application/use-cases/get-service.use-case';
import { ListServicesUseCase } from '../application/use-cases/list-services.use-case';
import { UpdateServiceUseCase } from '../application/use-cases/update-service.use-case';
import { DeactivateServiceUseCase } from '../application/use-cases/deactivate-service.use-case';
import { SetServiceEmployeesUseCase } from '../application/use-cases/set-service-employees.use-case';
import { ListEligibleEmployeesUseCase } from '../application/use-cases/list-eligible-employees.use-case';
import { CreateServiceRequestDto } from './dto/create-service.request.dto';
import { UpdateServiceRequestDto } from './dto/update-service.request.dto';
import { SetServiceEmployeesRequestDto } from './dto/set-service-employees.request.dto';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { Service, ServiceStatus } from '../domain/entities/service.entity';
import { Employee } from '../../employees/domain/entities/employee.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/services')
export class ServicesController {
  constructor(
    private readonly createService: CreateServiceUseCase,
    private readonly getService: GetServiceUseCase,
    private readonly listServices: ListServicesUseCase,
    private readonly updateService: UpdateServiceUseCase,
    private readonly deactivateService: DeactivateServiceUseCase,
    private readonly setServiceEmployees: SetServiceEmployeesUseCase,
    private readonly listEligibleEmployees: ListEligibleEmployeesUseCase,
  ) {}

  @Post()
  @Auth('service:manage')
  async create(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: CreateServiceRequestDto,
  ) {
    const service = await this.createService.execute({
      establishmentId,
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description,
      priceCents: Math.round(dto.price * 100),
      durationMinutes: dto.durationMinutes,
      bufferBeforeMinutes: dto.bufferBeforeMinutes,
      bufferAfterMinutes: dto.bufferAfterMinutes,
    });
    return this.toResponse(service);
  }

  @Get()
  @Auth('service:read')
  async list(
    @Param('establishmentId') establishmentId: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: ServiceStatus,
  ) {
    const services = await this.listServices.execute(establishmentId, { categoryId, status });
    return services.map((service) => this.toResponse(service));
  }

  @Get(':serviceId')
  @Auth('service:read')
  async getOne(
    @Param('establishmentId') establishmentId: string,
    @Param('serviceId') serviceId: string,
  ) {
    const service = await this.getService.execute({ establishmentId, serviceId });
    return this.toResponse(service);
  }

  @Patch(':serviceId')
  @Auth('service:manage')
  async update(
    @Param('establishmentId') establishmentId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceRequestDto,
  ) {
    const service = await this.updateService.execute({
      establishmentId,
      serviceId,
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description,
      priceCents: dto.price !== undefined ? Math.round(dto.price * 100) : undefined,
      durationMinutes: dto.durationMinutes,
      bufferBeforeMinutes: dto.bufferBeforeMinutes,
      bufferAfterMinutes: dto.bufferAfterMinutes,
    });
    return this.toResponse(service);
  }

  @Delete(':serviceId')
  @Auth('service:manage')
  async remove(
    @Param('establishmentId') establishmentId: string,
    @Param('serviceId') serviceId: string,
  ) {
    const service = await this.deactivateService.execute({ establishmentId, serviceId });
    return this.toResponse(service);
  }

  @Put(':serviceId/employees')
  @Auth('service:manage')
  async setEmployees(
    @Param('establishmentId') establishmentId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: SetServiceEmployeesRequestDto,
  ) {
    const employeeIds = await this.setServiceEmployees.execute({
      establishmentId,
      serviceId,
      employeeIds: dto.employeeIds,
    });
    return { serviceId, employeeIds };
  }

  @Get(':serviceId/employees')
  @Auth('service:read')
  async getEligibleEmployees(
    @Param('establishmentId') establishmentId: string,
    @Param('serviceId') serviceId: string,
  ) {
    const employees = await this.listEligibleEmployees.execute({ establishmentId, serviceId });
    return employees.map((employee) => this.toEmployeeResponse(employee));
  }

  private toEmployeeResponse(employee: Employee) {
    return {
      id: employee.id,
      establishmentId: employee.establishmentId,
      userId: employee.userId,
      jobTitle: employee.jobTitle,
      status: employee.status,
    };
  }

  private toResponse(service: Service) {
    return {
      id: service.id,
      establishmentId: service.establishmentId,
      categoryId: service.categoryId,
      name: service.name,
      description: service.description,
      price: service.priceCents / 100,
      durationMinutes: service.durationMinutes,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      status: service.status,
    };
  }
}
