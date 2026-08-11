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
  timezone: string;
  address: EstablishmentAddress;
  phones: string[];
  cancellationMinHoursNotice: number;
  noShowFeeEnabled: boolean;
  noShowFeePercentage: number | null;
  depositEnabled: boolean;
  depositPercentage: number | null;
};

export type UpdateEstablishmentInput = {
  name?: string;
  slug?: string;
  timezone?: string;
  address?: Partial<EstablishmentAddress>;
  phones?: string[];
  cancellationMinHoursNotice?: number;
  noShowFeeEnabled?: boolean;
  noShowFeePercentage?: number | null;
  depositEnabled?: boolean;
  depositPercentage?: number | null;
};

export type BusinessHoursDay = {
  weekday: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};
