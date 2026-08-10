import { Review } from './review.entity';
import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

describe('Review', () => {
  it('creates a review with a valid rating', () => {
    const review = Review.create({
      id: 'review-1',
      establishmentId: 'establishment-1',
      appointmentId: 'appointment-1',
      clientId: 'client-1',
      employeeId: 'employee-1',
      rating: 5,
      comment: '  Ótimo atendimento  ',
    });
    expect(review.rating).toBe(5);
    expect(review.comment).toBe('Ótimo atendimento');
  });

  it('rejects a rating outside 1-5', () => {
    expect(() =>
      Review.create({
        id: 'review-1',
        establishmentId: 'establishment-1',
        appointmentId: 'appointment-1',
        clientId: 'client-1',
        rating: 0,
      }),
    ).toThrow(ValidationError);
    expect(() =>
      Review.create({
        id: 'review-1',
        establishmentId: 'establishment-1',
        appointmentId: 'appointment-1',
        clientId: 'client-1',
        rating: 6,
      }),
    ).toThrow(ValidationError);
  });

  it('allows an empty comment', () => {
    const review = Review.create({
      id: 'review-1',
      establishmentId: 'establishment-1',
      appointmentId: 'appointment-1',
      clientId: 'client-1',
      rating: 4,
    });
    expect(review.comment).toBeNull();
  });
});
