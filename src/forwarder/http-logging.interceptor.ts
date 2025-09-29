// src/common/interceptors/http-logging.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest<Request>() as any;
    const method = req?.method;
    const url = req?.url;
    const ip = (req?.ip || req?.socket?.remoteAddress || '').toString();

    this.logger.log(`Incoming ${method} ${url} from ${ip}`);

    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `Handled ${method} ${url} in ${Date.now() - start}ms`,
          ),
        error: (err) =>
          this.logger.error(
            `Error ${method} ${url} in ${Date.now() - start}ms`,
            err?.stack,
          ),
      }),
    );
  }
}
