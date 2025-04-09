//? throttler-behind-proxy.guard.ts
//? Nginx, AWS Load Balancer(ALB), Cloudflare 등의 프록시 서버 뒤에서 운영할 경우 사용
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const ip: string = req.ips.length ? req.ips[0] : req.ip;
    return Promise.resolve(ip);
  }
}
