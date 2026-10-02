import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { runWithUniversityContext } from './university-context';

interface AuthenticatedHttpRequest {
  user?: {
    userId?: string;
    rootOrganizationId?: string | null;
  };
}

@Injectable()
export class UniversityContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedHttpRequest>();
    const userId = request.user?.userId;
    const rootOrganizationId = request.user?.rootOrganizationId;
    if (!userId || !rootOrganizationId) return next.handle();

    return new Observable((subscriber) =>
      runWithUniversityContext({ userId, rootOrganizationId }, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}
