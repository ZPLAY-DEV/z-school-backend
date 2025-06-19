import { Controller, Get } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiHeader({ name: 'Authorization', description: 'JWT Token' })
@ApiTags('✅ App ( App 정보 )')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('/version')
  version(): { version: string } {
    const version = this.appService.getVersion();
    return { version };
  }

  @Public()
  @Get('/purge/bookings')
  async purgeBookings(): Promise<void> {
    await this.appService.purgeBookings();
  }
  @Public()
  @Get('/purge/trackings')
  async purgeTrackings(): Promise<void> {
    await this.appService.purgeTracking();
  }
  @Public()
  @Get('/purge/cache')
  purgeCache(): Promise<number> {
    return this.appService.purgeCache();
  }

  @Public()
  @Get('error')
  getError() {
    throw new Error('My first error for Sentry testing!');
  }
}

// redis 테스트용 컨트롤러
// @Controller()
// export class AppController {
//   constructor(
//     private readonly redisCacheService: RedisCacheService,
//     private readonly redisMessageService: RedisMessageService,
//   ) {
//     this.redisMessageService.subscribe('test-channel', (message) => {
//       console.log('Received message:', message);
//     });
//   }

//   @Get('cache')
//   async testCache() {
//     await this.redisCacheService.set('test-key', { value: 'Hello' }, 60); // 60초 TTL
//     const cached = await this.redisCacheService.get('test-key');
//     return { cached };
//   }

//   @Get('publish')
//   async testPublish() {
//     await this.redisMessageService.publish('test-channel', {
//       msg: 'Hello from Redis',
//     });
//     return { status: 'Message published' };
//   }

//   @Get('emit')
//   async testEmit() {
//     await this.redisMessageService.emitEvent('test-event', {
//       data: 'Event data',
//     });
//     return { status: 'Event emitted' };
//   }
// }
