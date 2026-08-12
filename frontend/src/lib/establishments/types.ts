export type EstablishmentAddress = {
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
};

export type Establishment = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  /** Free-text presentation shown to clients. */
  description: string | null;
  timezone: string;
  address: EstablishmentAddress;
  phones: string[];
  cancellationMinHoursNotice: number;
  noShowFeeEnabled: boolean;
  noShowFeePercentage: number | null;
  depositEnabled: boolean;
  depositPercentage: number | null;
  /** Which of the two standard reminder windows fire for this establishment's appointments. */
  reminder24hEnabled: boolean;
  reminder2hEnabled: boolean;
  /** Channel kill switch — applies to every notification type, not just reminders. */
  notifyEmailEnabled: boolean;
};

export type UpdateEstablishmentInput = {
  name?: string;
  slug?: string;
  /** Empty string clears it. */
  description?: string;
  timezone?: string;
  address?: Partial<EstablishmentAddress>;
  phones?: string[];
  cancellationMinHoursNotice?: number;
  noShowFeeEnabled?: boolean;
  noShowFeePercentage?: number | null;
  depositEnabled?: boolean;
  depositPercentage?: number | null;
  reminder24hEnabled?: boolean;
  reminder2hEnabled?: boolean;
  notifyEmailEnabled?: boolean;
};

export type BusinessHoursDay = {
  weekday: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};
