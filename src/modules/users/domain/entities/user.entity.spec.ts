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
});
