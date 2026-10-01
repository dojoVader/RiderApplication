import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(UnauthorizedException)
export class UnauthorizedFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message || 'Unauthorized';

    // We need to handle the response if it's not XHR then we should redirect to the login page
    if (ctx.getResponse().xhr) {
      return response.status(status).json({
        statusCode: status,
        message: message,
      });
    } else {
      response
        .status(status)
        .redirect('/login?error=true&message=' + message + '');
    }
  }
}

@Catch(ForbiddenException)
export class ForbiddenException implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message || 'Unauthorized';

    // We need to handle the response if it's not XHR then we should redirect to the login page
    if (ctx.getResponse().xhr) {
      return response.status(status).json({
        statusCode: status,
        message: message,
      });
    } else {
      response
        .status(status)
        .redirect('/login?error=true&message=' + message + '');
    }
  }
}
