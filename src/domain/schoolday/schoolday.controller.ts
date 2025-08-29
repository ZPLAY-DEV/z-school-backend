import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { Actor } from 'src/common/enums';

import { UpdateSchooldayTimeDto } from 'src/domain/schoolday/dto/update-schoolday.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { formatDateInKST } from 'src/helpers/time';
import { SchooldayService } from './schoolday.service';
import {
  GetSchooldayByIdDocs,
  GetSchooldayListDocs,
  GetSchooldayPaginatedListDocs,
  GetTodaySchooldaysDocs,
  UpdateSchooldayTimeDocs,
} from './swagger/schoolday-swagger.decorator';

@ApiTags('✳️ Schooldays ( 수업일 )')
@Controller('schooldays')
@UseInterceptors(ClassSerializerInterceptor)
export class SchooldayController {
  constructor(private readonly schooldayService: SchooldayService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @GetSchooldayListDocs()
  @Get()
  async getList(
    @Query('schoolId') schoolId?: number,
    @Query('termId') termId?: number,
    @Query('groupId') groupId?: number,
    @Query('date') date?: string,
  ): Promise<Schoolday[]> {
    return await this.schooldayService.list(schoolId, termId, groupId, date);
  }

  @GetTodaySchooldaysDocs()
  @Get('today')
  async getToday(
    @Query('schoolId') schoolId: number,
    @Query('termId') termId: number,
  ): Promise<Schoolday[]> {
    return await this.schooldayService.getToday(schoolId, termId);
  }

  @GetSchooldayPaginatedListDocs()
  @Get('paginated')
  async getInfiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Schoolday>> {
    return await this.schooldayService.infiniteList(query);
  }

  @GetSchooldayByIdDocs()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Schoolday> {
    return await this.schooldayService.findById(id, [
      'group',
      'group.picks',
      'group.picks.student',
      'group.lesson',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  //! 수업일 변경시 다이나모 출석부도 변경됨.
  @UpdateSchooldayTimeDocs()
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateSchooldayTimeDto,
    @CurrentUserIdAndRole() user: { id: number; role: string },
  ): Promise<Schoolday> {
    const { startsAt, endsAt } = await this.schooldayService.findById(id);

    // DTO에 startsAt 키가 포함되어 있는지 확인

    if (
      startsAt &&
      endsAt &&
      dto.startsAt &&
      dto.endsAt &&
      startsAt === dto.startsAt &&
      endsAt === dto.endsAt
    ) {
      throw new BadRequestException(
        '입력값이 유효하지 않습니다. 다시 확인해주세요.',
      );
    }
    const role =
      user.role === 'MANAGER'
        ? Actor.MANAGER
        : user.role === 'INSTRUCTOR'
          ? Actor.INSTRUCTOR
          : Actor.OTHER;
    const schoolday = await this.schooldayService.update(id, {
      ...dto,
      updatedBy: role,
    });

    if ('startsAt' in dto) {
      schoolday.original = schoolday.today;
      schoolday.today = formatDateInKST(schoolday.startsAt);
    }

    return schoolday;
  }
}
