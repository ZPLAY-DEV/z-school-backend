import { Controller, Get, HttpCode, Post } from '@nestjs/common';
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
  @HttpCode(200)
  @Post('/purge/bookings')
  async purgeBookings(): Promise<void> {
    console.log('🔥 purgeBookings');
    await this.appService.purgeBookings();
  }

  @Public()
  @HttpCode(200)
  @Post('/purge/trackings')
  async purgeTrackings(): Promise<void> {
    console.log('🔥 purgeTrackings');
    await this.appService.purgeTrackings();
  }

  @Public()
  @HttpCode(200)
  @Post('/purge/cache')
  async purgeCache(): Promise<void> {
    console.log('🔥 purgeCache');
    await this.appService.purgeCache();
  }

  @Public()
  @Get('error')
  getError() {
    throw new Error('My first error for Sentry testing!');
  }
}
