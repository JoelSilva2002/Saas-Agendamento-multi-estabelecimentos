import { Tenant } from './tenant.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

describe('Tenant', () => {
  it('creates a valid tenant', () => {
    const tenant = Tenant.create({ id: '1', name: 'Barbearia do Zé', slug: 'barbearia-do-ze' });
    expect(tenant.name).toBe('Barbearia do Zé');
    expect(tenant.slug).toBe('barbearia-do-ze');
    expect(tenant.status).toBe('active');
    expect(tenant.document).toBeNull();
    expect(tenant.plan).toBe('premium');
  });

  it('accepts an explicit document', () => {
    const tenant = Tenant.create({
      id: '1',
      name: 'Barbearia do Zé',
      slug: 'barbearia-do-ze',
      document: '12.345.678/0001-99',
    });
    expect(tenant.document).toBe('12.345.678/0001-99');
  });

  it('rejects an empty name', () => {
    expect(() => Tenant.create({ id: '1', name: '  ', slug: 'valid-slug' })).toThrow(ValidationError);
  });

  it('rejects an invalid slug format', () => {
    expect(() => Tenant.create({ id: '1', name: 'Nome', slug: 'Slug Inválido!' })).toThrow(ValidationError);
  });

  describe('changeStatus', () => {
    it('moves between active, suspended and cancelled', () => {
      const tenant = Tenant.create({ id: '1', name: 'Nome', slug: 'slug' });
      const suspended = tenant.changeStatus('suspended');
      expect(suspended.status).toBe('suspended');

      const reactivated = suspended.changeStatus('active');
      expect(reactivated.status).toBe('active');
    });

    it('throws when trying to change a cancelled tenant', () => {
      const tenant = Tenant.create({ id: '1', name: 'Nome', slug: 'slug' }).changeStatus('cancelled');
      expect(() => tenant.changeStatus('active')).toThrow(ValidationError);
    });
  });
});
