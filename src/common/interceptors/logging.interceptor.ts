import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;

    // Log request details
    this.logger.log(`=== ${method} ${url} ===`);

    // Log request body for POST, PUT, PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      this.logger.log(`Request Body: ${JSON.stringify(body)}`);
    }

    // Log query parameters if present
    if (query && Object.keys(query).length > 0) {
      this.logger.log(`Query Params: ${JSON.stringify(query)}`);
    }

    // Log route parameters if present
    if (params && Object.keys(params).length > 0) {
      this.logger.log(`Route Params: ${JSON.stringify(params)}`);
    }

    return next.handle().pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const delay = Date.now() - now;

        // Log response info
        this.logger.log(`Response [${statusCode}]: ${JSON.stringify(data)}`);
        this.logger.log(`Completed in ${delay}ms`);
        this.logger.log(`=== END ${method} ${url} ===`);
      }),
    );
  }
}
