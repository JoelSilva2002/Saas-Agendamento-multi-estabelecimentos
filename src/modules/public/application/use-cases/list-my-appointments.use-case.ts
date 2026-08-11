import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { AppointmentStatus } from '../../../appointments/domain/entities/appointment.entity';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { ServiceRepositoryPort } from '../../../services/domain/service.repository.port';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';

export interface MyAppointment {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  priceCents: number;
  serviceName: string;
  employeeName: string;
  establishmentName: string;
  establishmentSlug: string;
  timeZone: string;
}

/**
 * The client's own booking history, across every establishment they have used.
 *
 * Names are resolved here rather than by the page, because a client must not be able to list a
 * tenant's services, employees or users — they may only see the specific rows their own
 * appointments point at.
 */
@Injectable()
export class ListMyAppointmentsUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(clientId: string): Promise<MyAppointment[]> {
    const appointments = await this.appointmentRepository.findAllByClient(clientId);

    return Promise.all(
      appointments.map(async (appointment) => {
        const [establishment, service, employee] = await Promise.all([
          this.establishmentRepository.findByIdUnscoped(appointment.establishmentId),
          this.serviceRepository.findById(appointment.serviceId, appointment.establishmentId),
          this.employeeRepository.findById(appointment.employeeId, appointment.establishmentId),
        ]);

        const employeeUser = employee ? await this.userRepository.findById(employee.userId) : null;

        return {
          id: appointment.id,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          status: appointment.status,
          priceCents: appointment.priceCents,
          serviceName: service?.name ?? 'Serviço removido',
          employeeName: employeeUser
            ? `${employeeUser.firstName} ${employeeUser.lastName}`.trim()
            : (employee?.jobTitle ?? '—'),
          establishmentName: establishment?.name ?? '—',
          establishmentSlug: establishment?.slug ?? '',
          timeZone: establishment?.timezone ?? 'UTC',
        };
      }),
    );
  }
}
