import { EstablishmentPhoto } from './entities/establishment-photo.entity';

export interface CreateEstablishmentPhotoParams {
  id: string;
  establishmentId: string;
  storageKey: string;
  thumbStorageKey: string;
  width: number;
  height: number;
  byteSize: number;
  caption: string | null;
  position: number;
}

export abstract class EstablishmentPhotoRepositoryPort {
  abstract create(params: CreateEstablishmentPhotoParams): Promise<EstablishmentPhoto>;
  /** Ordered by position asc, createdAt asc — the order the public gallery renders in. */
  abstract findAllByEstablishment(establishmentId: string): Promise<EstablishmentPhoto[]>;
  abstract findByIdInEstablishment(id: string, establishmentId: string): Promise<EstablishmentPhoto | null>;
  abstract countByEstablishment(establishmentId: string): Promise<number>;
  abstract delete(id: string): Promise<void>;
  /** Rewrites `position` for every photo in `orderedIds` to match its index. Caller has already
   * validated `orderedIds` is exactly the establishment's current photo id set. */
  abstract reorder(establishmentId: string, orderedIds: string[]): Promise<EstablishmentPhoto[]>;
}
