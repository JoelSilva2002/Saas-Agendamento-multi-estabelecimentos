import { Injectable } from '@nestjs/common';
import { BusinessHoursRepositoryPort } from '../../domain/business-hours.repository.port';
import { BusinessHoursDay } from '../../domain/entities/business-hours-day.entity';

@Injectable()
export class GetBusinessHoursUseCase {
  constructor(private readonly businessHoursRepository: BusinessHoursRepositoryPort) {}

  async execute(establishmentId: string): Promise<BusinessHoursDay[]> {
    return this.businessHoursRepository.findAllByEstablishment(establishmentId);
  }
}
