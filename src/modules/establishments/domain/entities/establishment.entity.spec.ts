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

  describe('cancellation policy', () => {
    it('defaults to 24h notice and no no-show fee', () => {
      const establishment = Establishment.create({
        id: '1',
        tenantId: 'tenant-1',
        name: 'Filial',
        slug: 'filial',
      });
      expect(establishment.cancellationMinHoursNotice).toBe(24);
      expect(establishment.noShowFeeEnabled).toBe(false);
      expect(establishment.noShowFeePercentage).toBeNull();
    });

    it('accepts a valid no-show fee configuration', () => {
      const establishment = Establishment.create({
        id: '1',
        tenantId: 'tenant-1',
        name: 'Filial',
        slug: 'filial',
        cancellationMinHoursNotice: 12,
        noShowFeeEnabled: true,
        noShowFeePercentage: 50,
      });
      expect(establishment.cancellationMinHoursNotice).toBe(12);
      expect(establishment.noShowFeePercentage).toBe(50);
    });

    it('rejects enabling the no-show fee without a percentage', () => {
      expect(() =>
        Establishment.create({
          id: '1',
          tenantId: 'tenant-1',
          name: 'Filial',
          slug: 'filial',
          noShowFeeEnabled: true,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects a percentage outside 1-100', () => {
      expect(() =>
        Establishment.create({
          id: '1',
          tenantId: 'tenant-1',
          name: 'Filial',
          slug: 'filial',
          noShowFeeEnabled: true,
          noShowFeePercentage: 0,
        }),
      ).toThrow(ValidationError);
      expect(() =>
        Establishment.create({
          id: '1',
          tenantId: 'tenant-1',
          name: 'Filial',
          slug: 'filial',
          noShowFeeEnabled: true,
          noShowFeePercentage: 101,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects a percentage set while the fee is disabled', () => {
      expect(() =>
        Establishment.create({
          id: '1',
          tenantId: 'tenant-1',
          name: 'Filial',
          slug: 'filial',
          noShowFeeEnabled: false,
          noShowFeePercentage: 50,
        }),
      ).toThrow(ValidationError);
    });

    it('update() disabling the fee auto-clears the percentage even if not explicitly nulled', () => {
      const establishment = Establishment.create({
        id: '1',
        tenantId: 'tenant-1',
        name: 'Filial',
        slug: 'filial',
        noShowFeeEnabled: true,
        noShowFeePercentage: 30,
      });
      const updated = establishment.update({ noShowFeeEnabled: false });
      expect(updated.noShowFeeEnabled).toBe(false);
      expect(updated.noShowFeePercentage).toBeNull();
    });
  });

  describe('deposit policy', () => {
    it('defaults to disabled with no percentage', () => {
      const establishment = Establishment.create({
        id: '1',
        tenantId: 'tenant-1',
        name: 'Filial',
        slug: 'filial',
      });
      expect(establishment.depositEnabled).toBe(false);
      expect(establishment.depositPercentage).toBeNull();
    });

    it('accepts a valid deposit configuration', () => {
      const establishment = Establishment.create({
        id: '1',
        tenantId: 'tenant-1',
        name: 'Filial',
        slug: 'filial',
        depositEnabled: true,
        depositPercentage: 30,
      });
      expect(establishment.depositPercentage).toBe(30);
    });

    it('rejects enabling the deposit without a percentage', () => {
      expect(() =>
        Establishment.create({
          id: '1',
          tenantId: 'tenant-1',
          name: 'Filial',
          slug: 'filial',
          depositEnabled: true,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects a percentage outside 1-100', () => {
      expect(() =>
        Establishment.create({
          id: '1',
          tenantId: 'tenant-1',
          name: 'Filial',
          slug: 'filial',
          depositEnabled: true,
          depositPercentage: 101,
        }),
      ).toThrow(ValidationError);
    });

    it('update() disabling the deposit auto-clears the percentage', () => {
      const establishment = Establishment.create({
        id: '1',
        tenantId: 'tenant-1',
        name: 'Filial',
        slug: 'filial',
        depositEnabled: true,
        depositPercentage: 30,
      });
      const updated = establishment.update({ depositEnabled: false });
      expect(updated.depositEnabled).toBe(false);
      expect(updated.depositPercentage).toBeNull();
    });
  });
});
