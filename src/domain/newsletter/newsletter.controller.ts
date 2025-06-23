import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { NewsletterService } from './newsletter.service';

@ApiTags('✅ Newsletters ( 공지사항 )')
@Controller('newsletters')
@UseInterceptors(ClassSerializerInterceptor)
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//
  @Post()
  @ApiOperation({ summary: '뉴스레터 생성' })
  create(@Body() dto: CreateNewsletterDto) {
    return this.newsletterService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? TRACKING
  //? ---------------------------------------------------------------------- ?//
  @Delete(':newsletterId/read')
  @ApiOperation({ summary: '뉴스레터 읽음 처리' })
  markAsRead(
    @Param('newsletterId', ParseIntPipe) newsletterId: number,
    @Query('parentId', ParseIntPipe) parentId: number,
  ) {
    return this.newsletterService.markAsRead(newsletterId, parentId);
  }

  @Get(':newsletterId/unread-parents')
  @ApiOperation({ summary: '읽지 않은 부모 목록 조회' })
  getUnreadParents(@Param('newsletterId', ParseIntPipe) newsletterId: number) {
    return this.newsletterService.getUnreadParents(newsletterId);
  }

  @Get(':newsletterId/read-status')
  @ApiOperation({ summary: '읽음 상태 확인' })
  isReadByParent(
    @Param('newsletterId', ParseIntPipe) newsletterId: number,
    @Query('parentId', ParseIntPipe) parentId: number,
  ) {
    return this.newsletterService.isReadByParent(newsletterId, parentId);
  }
}
