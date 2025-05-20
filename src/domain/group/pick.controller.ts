import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { Actor } from 'src/common/enums';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { TraceableNoteDto } from 'src/domain/group/dto/delete-group.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Pick } from 'src/domain/group/entities/pick.entity';
import { PickService } from 'src/domain/group/pick.service';
import {
  CreatePickBulkDocs,
  CreatePickDocs,
  DeletePickDocs,
  ListPicksDocs,
  PaginatedListPicksDocs,
  UpdatePickDocs,
} from './swagger/group-student-swagger.decorator';

@ApiTags('✅ Groups > Students ( 반 > 수강생 )')
@ApiCommonErrorResponseTemplate()
@Controller('groups')
@UseInterceptors(ClassSerializerInterceptor)
export class PickController {
  constructor(private readonly pickService: PickService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreatePickDocs()
  @ApiOperation({ description: '학생을 반에 등록합니다' })
  @Post(':groupId/students/:studentId')
  async create(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: TraceableNoteDto,
    @CurrentUserIdAndRole() user: { id: number; role: string },
  ): Promise<Pick> {
    const role =
      user.role === 'MANAGER'
        ? Actor.MANAGER
        : user.role === 'INSTRUCTOR'
          ? Actor.INSTRUCTOR
          : Actor.OTHER;
    return await this.pickService.create({
      ...dto,
      groupId,
      studentId,
      enrolledBy: role,
    });
  }

  @CreatePickBulkDocs()
  @ApiOperation({ description: '여러 학생을 한 번에 반에 등록합니다' })
  @Post(':groupId/students/bulk')
  async createBulk(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body('studentIds') studentIds: number[],
  ): Promise<Pick[]> {
    return await this.pickService.createBulk(groupId, studentIds);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ListPicksDocs()
  @ApiOperation({ description: '반에 등록된 모든 학생 목록을 조회합니다' })
  @Get(':groupId/students')
  async getList(
    @Param('groupId', ParseIntPipe) groupId: number,
  ): Promise<Pick[]> {
    return await this.pickService.list(groupId);
  }

  @PaginatedListPicksDocs()
  @ApiOperation({
    description: '반에 등록된 학생 목록을 페이지네이션으로 조회합니다',
  })
  @Get(':groupId/students/paginated')
  async getInfiniteList(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query() query: PaginateQuery,
  ): Promise<Paginated<Pick>> {
    return await this.pickService.infiniteList(groupId, query);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdatePickDocs()
  @ApiOperation({ description: '반에 등록된 특정 학생의 정보를 수정합니다' })
  @Patch(':groupId/students/:studentId')
  async update(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpdateGroupDto,
  ): Promise<Pick> {
    return await this.pickService.update(groupId, studentId, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeletePickDocs()
  @ApiOperation({ description: '반에서 특정 학생을 삭제합니다' })
  @Delete(':groupId/students/:studentId')
  async remove(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: TraceableNoteDto,
    @CurrentUserIdAndRole() user: { id: number; role: string },
  ): Promise<void> {
    const role =
      user.role === 'MANAGER'
        ? Actor.MANAGER
        : user.role === 'INSTRUCTOR'
          ? Actor.INSTRUCTOR
          : Actor.OTHER;
    await this.pickService.remove({
      ...dto,
      groupId,
      studentId,
      deletedBy: role,
    });
  }
}
