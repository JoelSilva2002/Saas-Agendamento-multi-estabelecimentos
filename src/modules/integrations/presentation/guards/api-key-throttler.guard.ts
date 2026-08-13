import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Throttles per API key rather than per IP — the default tracker (IP) would let every
// bot behind one gateway/proxy share a single bucket. Relies on IntegrationAuthGuard having
// already populated request.apiKeyId, so this must run AFTER it in the guard chain (see
// IntegrationAuth decorator).
@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const apiKeyId = req.apiKeyId as string | undefined;
    return apiKeyId ?? (req.ip as string);
  }
}
