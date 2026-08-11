export type AgendaBlockRecord = {
  id: string;
  establishmentId: string;
  employeeId: string | null;
  startAt: string;
  endAt: string;
  reason: string | null;
  createdById: string;
};

export type ListAgendaBlocksParams = {
  fromDate?: string;
  toDate?: string;
  employeeId?: string;
};

export type CreateAgendaBlockInput = {
  employeeId: string | null;
  startAt: string;
  endAt: string;
  reason?: string;
};
