import { User } from './user.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

describe('User', () => {
  it('creates a valid user and lowercases the email', () => {
    const user = User.create({
      id: '1',
      email: 'Owner@Example.com',
      passwordHash: 'hash',
      firstName: 'Ana',
      lastName: 'Silva',
    });
    expect(user.email).toBe('owner@example.com');
    expect(user.isActive).toBe(true);
    expect(user.isPlatformAdmin).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(() =>
      User.create({ id: '1', email: 'not-an-email', passwordHash: 'hash', firstName: 'Ana', lastName: 'Silva' }),
    ).toThrow(ValidationError);
  });

  it('rejects an empty first name', () => {
    expect(() =>
      User.create({ id: '1', email: 'a@b.com', passwordHash: 'hash', firstName: ' ', lastName: 'Silva' }),
    ).toThrow(ValidationError);
  });

  it('update() changes only provided fields', () => {
    const user = User.create({
      id: '1',
      email: 'a@b.com',
      passwordHash: 'hash',
      firstName: 'Ana',
      lastName: 'Silva',
    });
    const updated = user.update({ isActive: false });
    expect(updated.isActive).toBe(false);
    expect(updated.firstName).toBe('Ana');
  });

  it('a normal account can always authenticate', () => {
    const user = User.create({
      id: '1',
      email: 'a@b.com',
      passwordHash: 'hash',
      firstName: 'Ana',
      lastName: 'Silva',
    });
    expect(user.canAuthenticate).toBe(true);
  });

  describe('createWalkIn', () => {
    it('creates a client with no email and no password', () => {
      const walkIn = User.createWalkIn({ id: '1', firstName: 'Maria' });
      expect(walkIn.email).toBeNull();
      expect(walkIn.passwordHash).toBeNull();
      expect(walkIn.firstName).toBe('Maria');
      expect(walkIn.lastName).toBe('');
      expect(walkIn.canAuthenticate).toBe(false);
    });

    it('accepts an optional last name and email, validated and normalized like a real account', () => {
      const walkIn = User.createWalkIn({
        id: '1',
        firstName: 'Maria',
        lastName: 'Souza',
        email: 'Maria@Example.com',
      });
      expect(walkIn.lastName).toBe('Souza');
      expect(walkIn.email).toBe('maria@example.com');
      // Still no password — an email alone doesn't grant login, only User.create() does.
      expect(walkIn.canAuthenticate).toBe(false);
    });

    it('rejects an invalid email when one is given', () => {
      expect(() =>
        User.createWalkIn({ id: '1', firstName: 'Maria', email: 'not-an-email' }),
      ).toThrow(ValidationError);
    });

    it('rejects an empty first name', () => {
      expect(() => User.createWalkIn({ id: '1', firstName: '  ' })).toThrow(ValidationError);
    });
  });
});
