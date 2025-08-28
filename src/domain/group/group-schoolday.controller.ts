import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { GroupSchooldayService } from 'src/domain/group/group-schoolday.service';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';

@ApiTags('✳️ Groups > Schoolday ( 반 > 수업일 조회 )')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('groups')
export class GroupSchooldayController {
  constructor(private readonly groupSchooldaysService: GroupSchooldayService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get(':groupId/schooldays')
  async list(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('date') date?: string, //! YYYY-MM,
  ): Promise<Schoolday[]> {
    return await this.groupSchooldaysService.list(groupId, date);
  }

  @Get(':groupId/schooldays/paginated')
  async infiniteList(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Schoolday>> {
    return await this.groupSchooldaysService.infiniteList(groupId, query);
  }
}
