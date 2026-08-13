import { ConflictError, NotFoundError, ValidationError } from '../../../../shared-kernel/domain/domain-error';

export class EstablishmentNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Establishment '${id}' não encontrado`);
  }
}

export class DuplicateEstablishmentSlugError extends ConflictError {
  constructor(slug: string) {
    super(`Já existe um estabelecimento com o slug '${slug}' neste tenant`);
  }
}

export class EstablishmentPhotoNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Foto '${id}' não encontrada`);
  }
}

export class GalleryLimitReachedError extends ConflictError {
  constructor(maxPhotos: number) {
    super(`Este estabelecimento já atingiu o limite de ${maxPhotos} fotos na galeria`);
  }
}

export class InvalidPhotoOrderError extends ValidationError {
  constructor() {
    super('A lista enviada precisa conter exatamente as fotos atuais do estabelecimento, sem repetição');
  }
}
