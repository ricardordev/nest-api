import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  /**
   * Override ThrottlerGuard method to identify client.
   *
   * Default behavior: uses req.ip (in a load-balanced scenario, this would be the proxy IP).
   * Override behavior: reads X-Forwarded-For first, uses req.ip as fallback.
   *
   * X-Forwarded-For may contain a chain of IPs when multiple proxies are involved:
   * Example: "200.x.x.x, 10.0.0.1, 172.16.0.1"
   * Result: the real client IP is always the first one in the chain.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getTracker(req: Request): Promise<string> {
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]
      ?.trim();

    if (forwarded) {
      return forwarded;
    }

    // Fallback: no proxy or load balancer, req.ip is the real IP
    return req.ip as string;
  }

  /**
   * Provides the execution context containing the Express request/response objects.
   *
   * Necessary because getTracker receives a generic request object.
   */
  protected getRequestResponse(context: ExecutionContext) {
    const http = context.switchToHttp();
    return {
      req: http.getRequest<Request>(),
      res: http.getResponse<Response>(),
    };
  }
}
