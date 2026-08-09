import { Employee } from './employee.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

describe('Employee', () => {
  const baseProps = {
    id: '1',
    establishmentId: 'establishment-1',
    userId: 'user-1',
    jobTitle: 'Barbeiro',
  };

  it('creates a valid employee as active', () => {
    const employee = Employee.create(baseProps);
    expect(employee.status).toBe('active');
    expect(employee.jobTitle).toBe('Barbeiro');
  });

  it('rejects an empty jobTitle', () => {
    expect(() => Employee.create({ ...baseProps, jobTitle: '  ' })).toThrow(ValidationError);
  });

  it('deactivate()/activate() toggle status immutably', () => {
    const employee = Employee.create(baseProps);
    const deactivated = employee.deactivate();
    expect(deactivated.status).toBe('inactive');
    expect(deactivated.activate().status).toBe('active');
    expect(employee.status).toBe('active');
  });
});
