import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { Actor } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { UpdateSchooldayTimeDto } from 'src/domain/schoolday/dto/update-schoolday.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayService } from './schoolday.service';
import {
  GetSchooldayByIdDocs,
  GetSchooldayListDocs,
  GetSchooldayPaginatedListDocs,
  UpdateSchooldayTimeDocs,
} from './swagger/schoolday-swagger.decorator';

@ApiTags('✅ Schooldays ( 수업일 )')
@ApiCommonErrorResponseTemplate()
@Controller('schooldays')
@UseInterceptors(ClassSerializerInterceptor)
export class SchooldayController {
  constructor(private readonly schooldayService: SchooldayService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @GetSchooldayListDocs()
  @Get()
  async getList(): Promise<Schoolday[]> {
    return await this.schooldayService.list();
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
    if (
      startsAt &&
      endsAt &&
      dto.startsAt &&
      dto.endsAt &&
      startsAt === dto.startsAt &&
      endsAt === dto.endsAt
    ) {
      throw new BadRequestException(HttpErrorConstants.VALIDATE_ERROR);
    }
    const role =
      user.role === 'MANAGER'
        ? Actor.MANAGER
        : user.role === 'INSTRUCTOR'
          ? Actor.INSTRUCTOR
          : Actor.OTHER;
    return await this.schooldayService.update(id, { ...dto, updatedBy: role });
  }
}
