/** A client as returned by GET .../clients — name/e-mail are resolved server-side from the
 * underlying User, so the frontend never has to join against the tenant's user list itself
 * (that list also contains staff, which is exactly the bug this replaced). */
export type Client = {
  id: string; // ClientProfile id
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  notes: string | null;
};

export type CreateClientInput = {
  firstName: string;
  /** Everything below is optional — a walk-in is often booked with nothing more than a
   * first name (see User.createWalkIn on the backend). */
  lastName?: string;
  email?: string;
  phone?: string;
};

export type CreateClientResult = {
  id: string; // ClientProfile id
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  /** False when an existing person was matched (by e-mail or phone) and reused instead of a
   * new account being created. */
  wasCreated: boolean;
};

export type UpdateClientProfileInput = {
  phone?: string;
  birthDate?: string;
  notes?: string;
};

export type ClientProfile = {
  id: string;
  establishmentId: string;
  userId: string;
  phone: string | null;
  birthDate: string | null;
  notes: string | null;
};
