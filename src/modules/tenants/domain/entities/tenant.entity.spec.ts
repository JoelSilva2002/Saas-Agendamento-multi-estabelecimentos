import { Tenant } from './tenant.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

describe('Tenant', () => {
  it('creates a valid tenant', () => {
    const tenant = Tenant.create({ id: '1', name: 'Barbearia do Zé', slug: 'barbearia-do-ze' });
    expect(tenant.name).toBe('Barbearia do Zé');
    expect(tenant.slug).toBe('barbearia-do-ze');
    expect(tenant.status).toBe('active');
  });

  it('rejects an empty name', () => {
    expect(() => Tenant.create({ id: '1', name: '  ', slug: 'valid-slug' })).toThrow(ValidationError);
  });

  it('rejects an invalid slug format', () => {
    expect(() => Tenant.create({ id: '1', name: 'Nome', slug: 'Slug Inválido!' })).toThrow(ValidationError);
  });
});
