export type MonthlyRevenue = {
  month: string;
  revenueCents: number;
};

export type ServiceMetric = {
  serviceId: string;
  count: number;
  revenueCents: number;
};

export type EmployeeMetric = {
  employeeId: string;
  count: number;
  revenueCents: number;
};

export type HourMetric = {
  hour: number;
  count: number;
};

export type ClientMetric = {
  clientId: string;
  count: number;
  revenueCents: number;
  lastVisitAt: string;
};

export type CancellationRate = {
  total: number;
  cancelled: number;
  noShow: number;
  completed: number;
  /** 0–1. */
  cancellationRate: number;
  /** 0–1. */
  noShowRate: number;
};

export type DateRangeParams = {
  fromDate?: string;
  toDate?: string;
};
