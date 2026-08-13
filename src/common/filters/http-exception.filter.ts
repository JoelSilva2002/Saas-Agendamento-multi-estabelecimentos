import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../shared-kernel/domain/domain-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, message } = this.resolve(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }

  private resolve(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string }).message ?? exception.message);
      return { status: exception.getStatus(), message: message as string };
    }

    if (exception instanceof NotFoundError) {
      return { status: HttpStatus.NOT_FOUND, message: exception.message };
    }

    if (exception instanceof ConflictError) {
      return { status: HttpStatus.CONFLICT, message: exception.message };
    }

    if (exception instanceof ValidationError) {
      return { status: HttpStatus.BAD_REQUEST, message: exception.message };
    }

    if (exception instanceof UnauthorizedError) {
      return { status: HttpStatus.UNAUTHORIZED, message: exception.message };
    }

    if (exception instanceof ForbiddenError) {
      return { status: HttpStatus.FORBIDDEN, message: exception.message };
    }

    // MulterError isn't an HttpException — without this branch a too-large upload would
    // otherwise fall through to a 500, turning a user error into a server error.
    if (exception instanceof MulterError) {
      if (exception.code === 'LIMIT_FILE_SIZE') {
        return { status: HttpStatus.PAYLOAD_TOO_LARGE, message: exception.message };
      }
      return { status: HttpStatus.BAD_REQUEST, message: exception.message };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
