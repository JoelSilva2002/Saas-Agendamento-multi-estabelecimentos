import { ClientProfile } from './client-profile.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

describe('ClientProfile', () => {
  it('creates a valid client profile with optional fields defaulting to null', () => {
    const profile = ClientProfile.create({ id: '1', establishmentId: 'establishment-1', userId: 'user-1' });
    expect(profile.phone).toBeNull();
    expect(profile.birthDate).toBeNull();
  });

  it('rejects a missing establishmentId', () => {
    expect(() => ClientProfile.create({ id: '1', establishmentId: '', userId: 'user-1' })).toThrow(ValidationError);
  });

  it('rejects a missing userId', () => {
    expect(() => ClientProfile.create({ id: '1', establishmentId: 'establishment-1', userId: '' })).toThrow(
      ValidationError,
    );
  });
});
