import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { Actor } from 'src/common/enums';
import { EndPickDto, StartPickDto } from 'src/domain/pick/dto/create-pick.dto';
import { UpdatePickDto } from 'src/domain/pick/dto/update-pick.dto';
import { Pick } from 'src/domain/pick/entities/pick.entity';
import { PickService } from 'src/domain/pick/pick.service';
import {
  DeletePickDocs,
  EndPickDocs,
  ListGroupsDocs,
  PaginatedListGroupsDocs,
  RestartPickDocs,
  StartPickDocs,
  UpdatePickDocs,
} from 'src/domain/pick/swagger/pick-swagger.decorator';

@ApiTags('✳️ Picks ( 확정수강생; 반·학생 pivot )')
@Controller('picks')
@UseInterceptors(ClassSerializerInterceptor)
export class PickController {
  constructor(private readonly pickService: PickService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @StartPickDocs()
  @HttpCode(200)
  @Post('start')
  async startPick(
    @Body() dtos: StartPickDto[],
    @CurrentUserIdAndRole() user: { id: number; role: string },
  ): Promise<number> {
    const role =
      user.role === 'MANAGER'
        ? Actor.MANAGER
        : user.role === 'INSTRUCTOR'
          ? Actor.INSTRUCTOR
          : Actor.OTHER;
    return await this.pickService.startPick(dtos, role, user.id);
  }

  @EndPickDocs()
  @HttpCode(200)
  @Post('end')
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

  @RestartPickDocs()
  @HttpCode(200)
  @Post('restart')
  async restartPick(
    @Body() dto: StartPickDto,
    @CurrentUserIdAndRole() user: { id: number; role: string },
  ): Promise<Pick> {
    const role =
      user.role === 'MANAGER'
        ? Actor.MANAGER
        : user.role === 'INSTRUCTOR'
          ? Actor.INSTRUCTOR
          : Actor.OTHER;

    return await this.pickService.restartPick({ ...dto, startedBy: role });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ListGroupsDocs()
  @Get('students/:studentId')
  async getGroupList(
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Pick[]> {
    return await this.pickService.listGroups(studentId);
  }

  @PaginatedListGroupsDocs()
  @Get('students/:studentId/paginated')
  async getGroupInfiniteList(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Pick>> {
    return await this.pickService.groupInfiniteList(studentId, query);
  }

  //? termId로 학생 목록 조회 (studentId 중복 제거)
  @Get('terms/:termId/students')
  async getStudentsByTerm(
    @Param('termId', ParseIntPipe) termId: number,
  ): Promise<Pick[]> {
    return await this.pickService.listStudentsByTerm(termId);
  }

  //? termId로 학생 목록 조회 (페이지네이션, studentId 중복 제거)
  @Get('terms/:termId/students/paginated')
  async getStudentsByTermPaginated(
    @Param('termId', ParseIntPipe) termId: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Pick>> {
    return await this.pickService.listStudentsByTermPaginated(termId, query);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdatePickDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePickDto,
  ): Promise<Pick> {
    return await this.pickService.update(id, dto);
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
