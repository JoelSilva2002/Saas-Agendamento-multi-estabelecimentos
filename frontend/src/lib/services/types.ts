export type ServiceStatus = "active" | "inactive";

export type CatalogService = {
  id: string;
  establishmentId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number; // reais, not cents
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  status: ServiceStatus;
};

export type ServiceCategory = {
  id: string;
  establishmentId: string;
  name: string;
  displayOrder: number;
};

export type CreateServiceInput = {
  name: string;
  description?: string;
  categoryId?: string;
  price: number;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

export type CreateServiceCategoryInput = {
  name: string;
  displayOrder?: number;
};

export type UpdateServiceCategoryInput = Partial<CreateServiceCategoryInput>;
