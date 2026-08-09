import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface BusinessHoursDayProps {
  weekday: number; // 0 = domingo .. 6 = sábado
  isClosed: boolean;
  openTime: string | null; // "HH:mm"
  closeTime: string | null; // "HH:mm"
}

export class BusinessHoursDay {
  private constructor(private readonly props: BusinessHoursDayProps) {}

  static create(props: BusinessHoursDayProps): BusinessHoursDay {
    if (!Number.isInteger(props.weekday) || props.weekday < 0 || props.weekday > 6) {
      throw new ValidationError('weekday deve ser um inteiro entre 0 (domingo) e 6 (sábado)');
    }

    if (props.isClosed) {
      return new BusinessHoursDay({ ...props, openTime: null, closeTime: null });
    }

    if (!props.openTime || !TIME_REGEX.test(props.openTime)) {
      throw new ValidationError('openTime inválido (esperado HH:mm) para um dia aberto');
    }
    if (!props.closeTime || !TIME_REGEX.test(props.closeTime)) {
      throw new ValidationError('closeTime inválido (esperado HH:mm) para um dia aberto');
    }
    if (props.openTime >= props.closeTime) {
      throw new ValidationError('openTime deve ser anterior a closeTime');
    }

    return new BusinessHoursDay(props);
  }

  static fromPersistence(props: BusinessHoursDayProps): BusinessHoursDay {
    return new BusinessHoursDay(props);
  }

  get weekday(): number {
    return this.props.weekday;
  }

  get isClosed(): boolean {
    return this.props.isClosed;
  }

  get openTime(): string | null {
    return this.props.openTime;
  }

  get closeTime(): string | null {
    return this.props.closeTime;
  }
}
