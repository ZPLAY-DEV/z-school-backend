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
import { getKoreanWeekday } from 'src/helpers/date';
import { convertKSTToUTC, formatDateInKST } from 'src/helpers/time';
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
    const schoolday = await this.schooldayService.findById(id, ['term']);

    // DTO에 startsAt 키가 포함되어 있는지 확인
    if ('startsAt' in dto) {
      const startsAtDate = formatDateInKST(dto.startsAt);
      if (
        startsAtDate < schoolday.term.start ||
        startsAtDate > schoolday.term.end
      ) {
        throw new BadRequestException(
          '학기를 벗어난 날짜입니다. 다시 확인해주세요.',
        );
      }
    }

    // DTO에 endsAt 키가 포함되어 있는지 확인
    if ('endsAt' in dto) {
      const endsAtDate = formatDateInKST(dto.endsAt);
      if (
        endsAtDate < schoolday.term.start ||
        endsAtDate > schoolday.term.end
      ) {
        throw new BadRequestException(
          '학기를 벗어난 날짜입니다. 다시 확인해주세요.',
        );
      }
    }

    const role =
      user.role === 'MANAGER'
        ? Actor.MANAGER
        : user.role === 'INSTRUCTOR'
          ? Actor.INSTRUCTOR
          : Actor.OTHER;

    // KST로 입력된 시간을 UTC로 변환
    const updateData: UpdateSchooldayTimeDto & { updatedBy: Actor } = {
      ...dto,
      updatedBy: role,
    };

    if ('startsAt' in dto) {
      updateData.startsAt = convertKSTToUTC(dto.startsAt);
    }

    if ('endsAt' in dto) {
      updateData.endsAt = convertKSTToUTC(dto.endsAt);
    }

    const newSchoolday = await this.schooldayService.update(id, updateData);

    // manipulate the response payload to reflect the changes
    if ('startsAt' in dto) {
      newSchoolday.original = newSchoolday.today;
      newSchoolday.today = formatDateInKST(newSchoolday.startsAt);
      newSchoolday.weekday = getKoreanWeekday(newSchoolday.today);
    }

    return newSchoolday;
  }
}
