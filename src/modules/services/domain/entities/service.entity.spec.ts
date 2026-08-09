import { Service } from './service.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

describe('Service', () => {
  const baseProps = {
    id: '1',
    establishmentId: 'establishment-1',
    name: 'Corte de cabelo',
    priceCents: 5000,
    durationMinutes: 30,
  };

  it('creates a valid service with default buffers', () => {
    const service = Service.create(baseProps);
    expect(service.status).toBe('active');
    expect(service.bufferBeforeMinutes).toBe(0);
    expect(service.bufferAfterMinutes).toBe(0);
  });

  it('rejects a negative price', () => {
    expect(() => Service.create({ ...baseProps, priceCents: -1 })).toThrow(ValidationError);
  });

  it('rejects a non-positive duration', () => {
    expect(() => Service.create({ ...baseProps, durationMinutes: 0 })).toThrow(ValidationError);
  });

  it('deactivate() flips status without mutating the original instance', () => {
    const service = Service.create(baseProps);
    const deactivated = service.deactivate();
    expect(deactivated.status).toBe('inactive');
    expect(service.status).toBe('active');
  });
});
