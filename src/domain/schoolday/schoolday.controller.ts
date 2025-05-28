import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { Actor } from 'src/common/enums';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { UpdateSchooldayTimeDto } from 'src/domain/schoolday/dto/update-schoolday.dto';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { SchooldayService } from './schoolday.service';

@Controller('schooldays')
export class SchooldayController {
  constructor(private readonly schooldayService: SchooldayService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Schoolday 생성' })
  @Post()
  async create(): Promise<any> {
    return await this.schooldayService.create();
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Schoolday 리스트 w/ Pagination' })
  @Get()
  async getList(): Promise<Schoolday[]> {
    return await this.schooldayService.list();
  }

  @ApiOperation({ description: 'Schoolday 리스트 w/ Pagination' })
  @Get('paginated')
  async getInfiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Schoolday>> {
    return await this.schooldayService.infiniteList(query);
  }

  @ApiOperation({ description: 'Schoolday 상세보기' })
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Schoolday> {
    return await this.schooldayService.findById(id, [
      'group',
      'group.groupStudents',
      'group.groupStudents.student',
      'group.lesson',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({
    description: 'Schoolday 의 시간 수정. dynamodb 출석부도 수정되어야 한다!',
  })
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

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.schooldayService.remove(id);
  }
}
