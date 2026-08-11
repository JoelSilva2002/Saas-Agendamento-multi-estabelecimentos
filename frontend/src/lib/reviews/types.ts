export type Review = {
  id: string;
  establishmentId: string;
  appointmentId: string;
  clientId: string;
  employeeId: string | null;
  rating: number;
  comment: string | null;
};

export type ReviewSummary = {
  average: number;
  count: number;
};
