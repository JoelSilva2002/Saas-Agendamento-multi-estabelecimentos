export type ClientProfile = {
  id: string;
  establishmentId: string;
  userId: string;
  phone: string | null;
  birthDate: string | null;
  notes: string | null;
};

export type UpdateClientProfileInput = {
  phone?: string;
  birthDate?: string;
  notes?: string;
};
