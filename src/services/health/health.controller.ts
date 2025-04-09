import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  checkToALB() {
    return { status: 'ok' };
  }

  @Get('admin-db-check')
  @HealthCheck()
  async check() {
    return this.health.check([
      async () => this.db.pingCheck('database'), //? check orm db status
    ]);
  }
}
