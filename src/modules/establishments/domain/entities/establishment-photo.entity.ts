export interface EstablishmentPhotoProps {
  id: string;
  establishmentId: string;
  storageKey: string;
  thumbStorageKey: string;
  width: number;
  height: number;
  byteSize: number;
  caption: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export class EstablishmentPhoto {
  private constructor(private readonly props: EstablishmentPhotoProps) {}

  static fromPersistence(props: EstablishmentPhotoProps): EstablishmentPhoto {
    return new EstablishmentPhoto(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get storageKey(): string {
    return this.props.storageKey;
  }

  get thumbStorageKey(): string {
    return this.props.thumbStorageKey;
  }

  get width(): number {
    return this.props.width;
  }

  get height(): number {
    return this.props.height;
  }

  get byteSize(): number {
    return this.props.byteSize;
  }

  get caption(): string | null {
    return this.props.caption;
  }

  get position(): number {
    return this.props.position;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
