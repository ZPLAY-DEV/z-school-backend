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
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { Actor, RemovalStatus } from 'src/common/enums';
import { BookedStudentDto } from 'src/domain/group/dto/booked-student.dto';
import { CreateGroupDto } from 'src/domain/group/dto/create-group.dto';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupService } from 'src/domain/group/group.service';
import {
  CreateGroupDocs,
  DeleteGroupDocs,
  FindGroupDocs,
  ListAvailableStudentsDocs,
  ListAvailableStudentsPaginatedDocs,
  ListBookedPendingStudentsDocs,
  ListCanceledStudentsDocs,
  ListCanceledStudentsPaginatedDocs,
  ListCurrentStudentsDocs,
  ListCurrentStudentsPaginatedDocs,
  RestoreGroupDocs,
  UpdateGroupDocs,
} from 'src/domain/group/swagger/group-swagger.decorator';
import { Pick as PickEntity } from 'src/domain/pick/entities/pick.entity';
import { Student } from 'src/domain/student/entities/student.entity';

@ApiTags('✳️ Groups ( 반 )')
@Controller('groups')
@UseInterceptors(ClassSerializerInterceptor)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateGroupDocs()
  @Post()
  async create(@Body() dto: CreateGroupDto): Promise<Group> {
    return this.groupService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindGroupDocs()
  @Get(':id')
  async findById(@Param('id') id: number): Promise<Group> {
    return await this.groupService.findById(id, [
      'schooldays',
      'picks',
      'picks.student',
      'contracts',
      'contracts.sam',
      'contracts.sam.instructor',
    ]);
  }

  @ListCurrentStudentsDocs()
  @Get(':id/current-students')
  async listCurrentStudents(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Student[]> {
    return await this.groupService.listCurrentStudents(id);
  }

  @ListCanceledStudentsDocs()
  @Get(':id/canceled-students')
  async listCanceledStudents(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Student[]> {
    return await this.groupService.listCanceledStudents(id);
  }

  @ListCurrentStudentsPaginatedDocs()
  @Get(':id/current-students/paginated')
  async listCurrentStudentsPaginated(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PickEntity>> {
    return await this.groupService.listCurrentStudentsPaginated(id, query);
  }

  @ListCanceledStudentsPaginatedDocs()
  @Get(':id/canceled-students/paginated')
  async listCanceledStudentsPaginated(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PickEntity>> {
    return await this.groupService.listCanceledStudentsPaginated(id, query);
  }

  @ListAvailableStudentsDocs()
  @Get(':id/available-students')
  async listAvailableStudents(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Student[]> {
    return await this.groupService.listAvailableStudents(id);
  }

  @ListAvailableStudentsPaginatedDocs()
  @Get(':id/available-students/paginated')
  async listAvailableStudentsPaginated(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Student>> {
    return await this.groupService.listAvailableStudentsPaginated(id, query);
  }

  @ListBookedPendingStudentsDocs()
  @Get(':id/booked-pending-students')
  async listBookedPendingStudents(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BookedStudentDto[]> {
    return await this.groupService.listBookedPendingStudents(id);
  }

  @Get(':id/booked-students')
  async listBookedStudents(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Student[]> {
    return await this.groupService.listBookedStudents(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateGroupDocs()
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateGroupDto,
  ): Promise<Group> {
    return await this.groupService.update(id, dto);
  }

  @RestoreGroupDocs()
  @Put(':id/restore')
  async restore(@Param('id') id: number): Promise<Group> {
    return await this.groupService.restore(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteGroupDocs()
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeleteGroupDto,
    @CurrentUserIdAndRole() user: { id: number; role: string },
  ): Promise<RemovalStatus> {
    const role =
      user.role === 'MANAGER'
        ? Actor.MANAGER
        : user.role === 'INSTRUCTOR'
          ? Actor.INSTRUCTOR
          : Actor.OTHER;
    return await this.groupService.removeWithDto(id, { ...dto, role });
  }
}
