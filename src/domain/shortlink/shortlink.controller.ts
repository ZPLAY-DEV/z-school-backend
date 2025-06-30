import {
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Shortlink } from 'src/domain/shortlink/entities/shortlink.entity';
import { ShortlinkService } from 'src/domain/shortlink/shortlink.service';
import {
  FindShortlinkByIdDocs,
  ListShortlinksDocs,
  SoftDeleteShortlinkDocs,
} from './swagger/shortlink-swagger.decorator';

@ApiTags('✅ Shortlinks ( 숏링크 )')
@Controller('shortlinks')
@UseInterceptors(ClassSerializerInterceptor)
export class ShortlinkController {
  constructor(private readonly shortlinkService: ShortlinkService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  //? 학교에 속한 강사(쌤)이 수강중인 group(강좌) 리스트
  @ListShortlinksDocs()
  @Get()
  async list(): Promise<Shortlink[]> {
    return await this.shortlinkService.list();
  }

  //? 학교에 속한 강사(쌤)의 상세 정보 조회
  @FindShortlinkByIdDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Shortlink> {
    return await this.shortlinkService.findById(id, ['parent', 'newsletter']);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @SoftDeleteShortlinkDocs()
  @Delete(':id')
  async softDelete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.shortlinkService.remove(id);
  }
}
