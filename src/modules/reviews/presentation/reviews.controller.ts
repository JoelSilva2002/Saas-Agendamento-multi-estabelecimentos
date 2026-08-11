import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/domain/request-context.types';
import { CreateReviewUseCase } from '../application/use-cases/create-review.use-case';
import { ListReviewsUseCase } from '../application/use-cases/list-reviews.use-case';
import { GetReviewSummaryUseCase } from '../application/use-cases/get-review-summary.use-case';
import { DeleteReviewUseCase } from '../application/use-cases/delete-review.use-case';
import { CreateReviewRequestDto } from './dto/create-review.request.dto';
import { Review } from '../domain/entities/review.entity';

@Controller('tenants/:tenantId/establishments/:establishmentId/reviews')
export class ReviewsController {
  constructor(
    private readonly createReview: CreateReviewUseCase,
    private readonly listReviews: ListReviewsUseCase,
    private readonly getReviewSummary: GetReviewSummaryUseCase,
    private readonly deleteReview: DeleteReviewUseCase,
  ) {}

  @Post()
  @Auth('review:create:own')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: CreateReviewRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const review = await this.createReview.execute({
      establishmentId,
      appointmentId: dto.appointmentId,
      clientId: user.id,
      rating: dto.rating,
      comment: dto.comment,
    });
    return this.toResponse(review);
  }

  // Declared before nothing dynamic follows it in this controller, but kept ahead of any
  // future `:reviewId`-style route for the same reason export/checkin-token were reordered
  // in AppointmentsController.
  @Get('summary')
  @Auth('review:read')
  async summary(
    @Param('establishmentId') establishmentId: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.getReviewSummary.execute(establishmentId, employeeId);
  }

  @Get()
  @Auth('review:read')
  async list(
    @Param('establishmentId') establishmentId: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const reviews = await this.listReviews.execute(establishmentId, { employeeId });
    return reviews.map((review) => this.toResponse(review));
  }

  @Delete(':reviewId')
  @Auth('review:moderate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('establishmentId') establishmentId: string,
    @Param('reviewId') reviewId: string,
  ) {
    await this.deleteReview.execute({ establishmentId, reviewId });
  }

  private toResponse(review: Review) {
    return {
      id: review.id,
      establishmentId: review.establishmentId,
      appointmentId: review.appointmentId,
      clientId: review.clientId,
      employeeId: review.employeeId,
      rating: review.rating,
      comment: review.comment,
    };
  }
}
