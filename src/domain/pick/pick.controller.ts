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
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { CreateBulkPickDto } from 'src/domain/pick/dto/create-bulk-pick.dto';
import { EndPickDto, StartPickDto } from 'src/domain/pick/dto/create-pick.dto';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { PickService } from 'src/domain/pick/pick.service';
import {
  CreatePickBulkDocs,
  CreatePickDocs,
  DeletePickDocs,
  EndPickDocs,
  ListPicksDocs,
  PaginatedListPicksDocs,
  UpdatePickDocs,
} from 'src/domain/pick/swagger/pick-swagger.decorator';

@ApiTags('✅ Pick ( 확정수강생; pivot )')
@ApiCommonErrorResponseTemplate()
@Controller('picks')
@UseInterceptors(ClassSerializerInterceptor)
export class PickController {
  constructor(private readonly pickService: PickService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreatePickDocs()
  @ApiOperation({ description: '수동으로 학생을 반에 등록합니다.' })
  @Post()
  async startPick(
    @Body() dto: StartPickDto,
    @CurrentUserIdAndRole() user: { id: number; role: string },
  ): Promise<Pick> {
    const role =
      user.role === 'MANAGER'
        ? Actor.MANAGER
        : user.role === 'INSTRUCTOR'
          ? Actor.INSTRUCTOR
          : Actor.OTHER;
    return await this.pickService.startPick({
      ...dto,
      startedBy: role,
    });
  }

  @CreatePickBulkDocs()
  @ApiOperation({ description: '여러 학생을 한 번에 반에 등록합니다' })
  @Post('/bulk')
  async createBulk(@Body() dto: CreateBulkPickDto): Promise<Pick[]> {
    return await this.pickService.createBulk(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ListPicksDocs()
  @Get('students/:studentId')
  async getGroupList(
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Pick[]> {
    return await this.pickService.listGroups(studentId);
  }

  @ListPicksDocs()
  @Get('groups/:groupId')
  async getStudentList(
    @Param('groupId', ParseIntPipe) groupId: number,
  ): Promise<Pick[]> {
    return await this.pickService.listStudents(groupId);
  }

  @PaginatedListPicksDocs()
  @Get('students/:studentId/paginated')
  async getGroupInfiniteList(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query() query: PaginateQuery,
  ): Promise<Paginated<Pick>> {
    return await this.pickService.groupInfiniteList(studentId, query);
  }

  @PaginatedListPicksDocs()
  @Get('groups/:groupId/paginated')
  async getStudentInfiniteList(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query() query: PaginateQuery,
  ): Promise<Paginated<Pick>> {
    return await this.pickService.studentInfiniteList(groupId, query);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdatePickDocs()
  @ApiOperation({ description: '반에 등록된 특정 학생의 정보를 수정합니다' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
  ): Promise<Pick> {
    return await this.pickService.update(id, dto);
  }

  @EndPickDocs()
  @ApiOperation({ description: '반에 등록된 특정 학생의 수업을 종료합니다' })
  @Patch()
  async endPick(
    @Body() dto: EndPickDto,
    @CurrentUserIdAndRole() user: { id: number; role: string },
  ): Promise<Pick> {
    const role =
      user.role === 'MANAGER'
        ? Actor.MANAGER
        : user.role === 'INSTRUCTOR'
          ? Actor.INSTRUCTOR
          : Actor.OTHER;
    return await this.pickService.endPick({
      ...dto,
      endedBy: role,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeletePickDocs()
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Pick> {
    return await this.pickService.remove(id);
  }
}
