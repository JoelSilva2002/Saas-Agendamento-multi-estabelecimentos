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

export type DateRangeParams = {
  fromDate?: string;
  toDate?: string;
};
