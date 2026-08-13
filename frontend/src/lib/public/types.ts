export type PublicAddress = {
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
};

export type PublicRating = {
  average: number;
  count: number;
};

export type PublicEstablishment = {
  tenantId: string;
  establishmentId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  logoThumbUrl: string | null;
  timezone: string;
  address: PublicAddress;
  phones: string[];
  rating: PublicRating;
};

export type PublicPhoto = {
  id: string;
  url: string;
  thumbUrl: string;
  caption: string | null;
  position: number;
};

export type PublicEstablishmentDetail = PublicEstablishment & {
  cancellationMinHoursNotice: number;
  photos: PublicPhoto[];
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  price: number; // reais
  durationMinutes: number;
  categoryId: string | null;
};

export type PublicEmployee = {
  id: string;
  name: string;
  jobTitle: string;
};

export type PublicSlot = {
  startAt: string;
  endAt: string;
};

export type SearchEstablishmentsParams = {
  city?: string;
  search?: string;
};
