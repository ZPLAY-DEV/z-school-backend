import {
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { EventService } from 'src/domain/event/event.service';

@ApiTags('✅ Events ( 출석 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('events')
export class EventController {
  constructor(private readonly eventsService: EventService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ summary: '⚙️ to initialize table' })
  @HttpCode(200)
  @Post('init')
  async init(): Promise<void> {
    await this.eventsService.init();
  }

  // @Get()
  // async fetch(
  //   @Query('groupId', ParseIntPipe) groupId: number,
  //   @Query('cursor') cursor?: string,
  // ): Promise<any> {
  //   if (!groupId) {
  //     throw new BadRequestException(HttpErrorConstants.INVALID_QUERY_PARAMS);
  //   }
  //   const groupKey = generateGroupKey(groupId);

  //   // cursor를 lastKey로 디코딩
  //   let lastKey: IEventKey | undefined = undefined;
  //   if (cursor) {
  //     try {
  //       const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
  //       const cursorData = JSON.parse(decoded);
  //       lastKey = {
  //         groupKey: cursorData.groupKey,
  //         dailyStudentKey: cursorData.dailyStudentKey,
  //       };
  //     } catch {
  //       throw new BadRequestException('Invalid cursor format');
  //     }
  //   }

  //   const res = await this.eventsService.fetch(groupKey, lastKey);

  //   // nextCursor 생성
  //   let nextCursor: string | undefined = undefined;
  //   if (res.lastKey) {
  //     const cursorData = {
  //       groupKey: res.lastKey.groupKey,
  //       dailyStudentKey: res.lastKey.dailyStudentKey,
  //     };
  //     nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
  //   }

  //   return {
  //     items: res.items,
  //     count: res.count,
  //     nextCursor,
  //     hasMore: !!res.lastKey,
  //   };
  // }

  // // @GetEventDetailDocs()
  // // @Get('detail')
  // // async getEventById(
  // //   @Query('groupId', ParseIntPipe) groupId: number,
  // //   @Query('date') date: string,
  // //   @Query('studentId', ParseIntPipe) studentId: number,
  // // ): Promise<IEvent> {
  // //   const groupKey = generateGroupKey(groupId);
  // //   const dailyStudentKey = `DATE#${date}#STUDENT#${studentId}`;
  // //   return await this.eventsService.findById({
  // //     groupKey,
  // //     dailyStudentKey,
  // //   });
  // // }

  // @Delete()
  // async delete(@Body() dto: EventKeyDto): Promise<void> {
  //   await this.eventsService.delete(dto);
  // }
}
