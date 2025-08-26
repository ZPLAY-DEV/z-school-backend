import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiHeader({ name: 'Authorization', description: 'JWT Token' })
@ApiTags('✳️ App ( App 정보 )')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/debug-sentry')
  getError() {
    throw new Error('My first Sentry error!');
  }

  @ApiOperation({ summary: '⚙️ 버전 조회' })
  @Public()
  @Get('/version')
  version(): { version: string } {
    const version = this.appService.getVersion();
    return { version };
  }

  @ApiOperation({ summary: '⚙️ 상태 조회' })
  @Public()
  @Get('/health')
  health(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @ApiOperation({ summary: '⚙️ 수강신청내용 Redis에서 삭제' })
  @Public()
  @HttpCode(200)
  @Post('/purge/bookings')
  async purgeBookings(): Promise<void> {
    console.log('🔥 purgeBookings');
    await this.appService.purgeBookings();
  }

  // @Public()
  // @HttpCode(200)
  // @Post('/purge/trackings')
  // async purgeTrackings(): Promise<void> {
  //   console.log('🔥 purgeTrackings');
  //   await this.appService.purgeTrackings();
  // }

  @ApiOperation({ summary: '⚙️ 캐시내용 Redis에서 삭제' })
  @Public()
  @HttpCode(200)
  @Post('/purge/cache')
  async purgeCache(): Promise<void> {
    console.log('🔥 purgeCache');
    await this.appService.purgeCache();
  }
}
