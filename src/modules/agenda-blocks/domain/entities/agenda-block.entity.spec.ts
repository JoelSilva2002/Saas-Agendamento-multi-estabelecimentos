import { AgendaBlock } from './agenda-block.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

describe('AgendaBlock', () => {
  const baseProps = {
    id: 'block-1',
    establishmentId: 'est-1',
    createdById: 'user-1',
    startAt: new Date('2026-01-01T10:00:00Z'),
    endAt: new Date('2026-01-01T11:00:00Z'),
  };

  it('creates a whole-establishment block when employeeId is omitted', () => {
    const block = AgendaBlock.create(baseProps);
    expect(block.employeeId).toBeNull();
    expect(block.reason).toBeNull();
  });

  it('creates an employee-scoped block with a trimmed reason', () => {
    const block = AgendaBlock.create({ ...baseProps, employeeId: 'emp-1', reason: '  Manutenção  ' });
    expect(block.employeeId).toBe('emp-1');
    expect(block.reason).toBe('Manutenção');
  });

  it('rejects endAt before or equal to startAt', () => {
    expect(() => AgendaBlock.create({ ...baseProps, endAt: baseProps.startAt })).toThrow(ValidationError);
    expect(() =>
      AgendaBlock.create({ ...baseProps, endAt: new Date('2026-01-01T09:00:00Z') }),
    ).toThrow(ValidationError);
  });

  it('rejects a missing establishmentId or createdById', () => {
    expect(() => AgendaBlock.create({ ...baseProps, establishmentId: '' })).toThrow(ValidationError);
    expect(() => AgendaBlock.create({ ...baseProps, createdById: '' })).toThrow(ValidationError);
  });
});
