import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../modules/auth/presentation/decorators/public.decorator';

// Deliberately dependency-free (no Prisma, no FileStoragePort): this is a liveness check, not a
// readiness check. A transient DB hiccup shouldn't make the host platform decide the whole
// process is dead and restart it — that would turn a recoverable blip into a cold start.
@Public()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }
}
