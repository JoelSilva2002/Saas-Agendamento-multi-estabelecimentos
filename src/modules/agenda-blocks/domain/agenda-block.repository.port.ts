import { AgendaBlock } from './entities/agenda-block.entity';

export interface AgendaBlockFilters {
  employeeId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export abstract class AgendaBlockRepositoryPort {
  abstract create(block: AgendaBlock): Promise<AgendaBlock>;
  abstract findById(id: string, establishmentId: string): Promise<AgendaBlock | null>;
  abstract findMany(establishmentId: string, filters: AgendaBlockFilters): Promise<AgendaBlock[]>;
  abstract delete(id: string, establishmentId: string): Promise<void>;
}
