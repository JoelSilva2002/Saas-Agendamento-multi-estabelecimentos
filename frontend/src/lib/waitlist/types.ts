export type WaitlistPeriod = "morning" | "afternoon" | "evening" | "any";
export type WaitlistStatus = "waiting" | "notified" | "converted" | "expired" | "cancelled";

export type WaitlistEntry = {
  id: string;
  establishmentId: string;
  clientId: string;
  serviceId: string;
  employeeId: string | null;
  desiredDate: string;
  desiredPeriod: WaitlistPeriod;
  status: WaitlistStatus;
};

export type JoinWaitlistInput = {
  clientId: string;
  serviceId: string;
  employeeId?: string;
  desiredDate: string;
  desiredPeriod?: WaitlistPeriod;
};
