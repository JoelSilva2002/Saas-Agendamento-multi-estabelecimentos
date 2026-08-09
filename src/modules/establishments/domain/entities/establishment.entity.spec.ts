import { Establishment } from './establishment.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

describe('Establishment', () => {
  it('creates a valid establishment with default timezone', () => {
    const establishment = Establishment.create({
      id: '1',
      tenantId: 'tenant-1',
      name: 'Filial Centro',
      slug: 'filial-centro',
    });
    expect(establishment.timezone).toBe('UTC');
    expect(establishment.deletedAt).toBeNull();
  });

  it('throws without a valid tenantId', () => {
    expect(() =>
      Establishment.create({ id: '1', tenantId: '', name: 'Filial', slug: 'filial' }),
    ).toThrow(ValidationError);
  });

  it('throws without a non-empty name', () => {
    expect(() =>
      Establishment.create({ id: '1', tenantId: 'tenant-1', name: '  ', slug: 'filial' }),
    ).toThrow(ValidationError);
  });

  it('update() returns a new instance with changed fields and bumped updatedAt', () => {
    const establishment = Establishment.create({
      id: '1',
      tenantId: 'tenant-1',
      name: 'Filial Centro',
      slug: 'filial-centro',
    });
    const updated = establishment.update({ name: 'Filial Centro Renovada' });
    expect(updated.name).toBe('Filial Centro Renovada');
    expect(updated.slug).toBe('filial-centro');
    expect(establishment.name).toBe('Filial Centro');
  });
});
