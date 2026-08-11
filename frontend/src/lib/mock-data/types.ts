// Shared catalog entity shapes, reused by both the client booking wizard and
// the admin agenda so both features draw from the same mock establishment.

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number; // major currency unit (reais), matches ServiceResponse.price
  durationMinutes: number;
};

export type Employee = {
  id: string;
  userId: string;
  jobTitle: string;
  // The real EmployeeResponse has no name/avatar — only userId. The UI needs
  // a display name, so this field is mock-only for now; a real integration
  // must join it in separately (backend change, or a client-side User lookup
  // per employeeId via GET /tenants/:tenantId/users).
  displayName: string;
};

export type Client = {
  id: string;
  displayName: string;
  phone: string;
};
