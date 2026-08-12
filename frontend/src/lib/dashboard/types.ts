export type DailySummary = {
  date: string;
  appointments: {
    total: number;
    byStatus: Record<string, number>;
  };
  revenueCents: number;
  newClients: number;
  /** 0–1. */
  cancellationRate: number;
  vacantSlots: number;
};
