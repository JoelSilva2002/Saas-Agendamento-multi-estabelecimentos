import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { CreateEmployeeUseCase } from '../application/use-cases/create-employee.use-case';
import { GetEmployeeUseCase } from '../application/use-cases/get-employee.use-case';
import { ListEmployeesUseCase } from '../application/use-cases/list-employees.use-case';
import { UpdateEmployeeUseCase } from '../application/use-cases/update-employee.use-case';
import { DeactivateEmployeeUseCase } from '../application/use-cases/deactivate-employee.use-case';
import { SetEmployeeScheduleUseCase } from '../application/use-cases/set-employee-schedule.use-case';
import { GetEmployeeScheduleUseCase } from '../application/use-cases/get-employee-schedule.use-case';
import { AddEmployeeTimeOffUseCase } from '../application/use-cases/add-employee-time-off.use-case';
import { ListEmployeeTimeOffUseCase } from '../application/use-cases/list-employee-time-off.use-case';
import { RemoveEmployeeTimeOffUseCase } from '../application/use-cases/remove-employee-time-off.use-case';
import { CreateEmployeeRequestDto } from './dto/create-employee.request.dto';
import { UpdateEmployeeRequestDto } from './dto/update-employee.request.dto';
import { SetEmployeeScheduleRequestDto } from './dto/set-employee-schedule.request.dto';
import { AddEmployeeTimeOffRequestDto } from './dto/add-employee-time-off.request.dto';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { Employee } from '../domain/entities/employee.entity';
import { EmployeeScheduleSlot } from '../domain/entities/employee-schedule-slot.entity';
import { EmployeeTimeOff } from '../domain/entities/employee-time-off.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/employees')
export class EmployeesController {
  constructor(
    private readonly createEmployee: CreateEmployeeUseCase,
    private readonly getEmployee: GetEmployeeUseCase,
    private readonly listEmployees: ListEmployeesUseCase,
    private readonly updateEmployee: UpdateEmployeeUseCase,
    private readonly deactivateEmployee: DeactivateEmployeeUseCase,
    private readonly setEmployeeSchedule: SetEmployeeScheduleUseCase,
    private readonly getEmployeeSchedule: GetEmployeeScheduleUseCase,
    private readonly addTimeOff: AddEmployeeTimeOffUseCase,
    private readonly listTimeOff: ListEmployeeTimeOffUseCase,
    private readonly removeTimeOff: RemoveEmployeeTimeOffUseCase,
  ) {}

  @Post()
  @Auth('employee:manage')
  async create(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
    @Body() dto: CreateEmployeeRequestDto,
  ) {
    const employee = await this.createEmployee.execute({
      tenantId,
      establishmentId,
      userId: dto.userId,
      jobTitle: dto.jobTitle,
      hiredAt: dto.hiredAt ? new Date(dto.hiredAt) : undefined,
    });
    return this.toResponse(employee);
  }

  @Get()
  @Auth('employee:read')
  async list(@Param('establishmentId') establishmentId: string) {
    const employees = await this.listEmployees.execute(establishmentId);
    return employees.map((employee) => this.toResponse(employee));
  }

  @Get(':employeeId')
  @Auth('employee:read')
  async getOne(@Param('establishmentId') establishmentId: string, @Param('employeeId') employeeId: string) {
    const employee = await this.getEmployee.execute({ establishmentId, employeeId });
    return this.toResponse(employee);
  }

  @Patch(':employeeId')
  @Auth('employee:manage')
  async update(
    @Param('establishmentId') establishmentId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateEmployeeRequestDto,
  ) {
    const employee = await this.updateEmployee.execute({
      establishmentId,
      employeeId,
      jobTitle: dto.jobTitle,
      hiredAt: dto.hiredAt ? new Date(dto.hiredAt) : undefined,
    });
    return this.toResponse(employee);
  }

  @Delete(':employeeId')
  @Auth('employee:manage')
  async remove(@Param('establishmentId') establishmentId: string, @Param('employeeId') employeeId: string) {
    const employee = await this.deactivateEmployee.execute({ establishmentId, employeeId });
    return this.toResponse(employee);
  }

  @Get(':employeeId/schedule')
  @Auth('employee:read')
  async getSchedule(@Param('employeeId') employeeId: string) {
    const slots = await this.getEmployeeSchedule.execute(employeeId);
    return slots.map((slot) => this.toScheduleResponse(slot));
  }

  @Put(':employeeId/schedule')
  @Auth('employee:manage')
  async putSchedule(
    @Param('establishmentId') establishmentId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: SetEmployeeScheduleRequestDto,
  ) {
    const slots = await this.setEmployeeSchedule.execute({ establishmentId, employeeId, slots: dto.slots });
    return slots.map((slot) => this.toScheduleResponse(slot));
  }

  @Post(':employeeId/time-off')
  @Auth('employee:manage')
  async addTimeOffEntry(
    @Param('establishmentId') establishmentId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: AddEmployeeTimeOffRequestDto,
  ) {
    const timeOff = await this.addTimeOff.execute({
      establishmentId,
      employeeId,
      type: dto.type,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      notes: dto.notes,
    });
    return this.toTimeOffResponse(timeOff);
  }

  @Get(':employeeId/time-off')
  @Auth('employee:read')
  async listTimeOffEntries(@Param('employeeId') employeeId: string) {
    const entries = await this.listTimeOff.execute(employeeId);
    return entries.map((entry) => this.toTimeOffResponse(entry));
  }

  @Delete(':employeeId/time-off/:timeOffId')
  @Auth('employee:manage')
  async removeTimeOffEntry(@Param('employeeId') employeeId: string, @Param('timeOffId') timeOffId: string) {
    await this.removeTimeOff.execute({ employeeId, timeOffId });
  }

  private toResponse(employee: Employee) {
    return {
      id: employee.id,
      establishmentId: employee.establishmentId,
      userId: employee.userId,
      jobTitle: employee.jobTitle,
      status: employee.status,
      hiredAt: employee.hiredAt,
    };
  }

  private toScheduleResponse(slot: EmployeeScheduleSlot) {
    return { weekday: slot.weekday, slotType: slot.slotType, startTime: slot.startTime, endTime: slot.endTime };
  }

  private toTimeOffResponse(timeOff: EmployeeTimeOff) {
    return {
      id: timeOff.id,
      employeeId: timeOff.employeeId,
      type: timeOff.type,
      startAt: timeOff.startAt,
      endAt: timeOff.endAt,
      notes: timeOff.notes,
    };
  }
}
