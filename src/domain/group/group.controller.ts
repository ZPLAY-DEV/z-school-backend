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
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { Actor, RemovalStatus } from 'src/common/enums';
import { CreateGroupDto } from 'src/domain/group/dto/create-group.dto';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { PickedStudentDto } from 'src/domain/group/dto/picked-student.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupService } from 'src/domain/group/group.service';
import {
  CreateGroupDocs,
  DeleteGroupDocs,
  FindGroupDocs,
  ListAvailableStudentsDocs,
  ListAvailableStudentsPaginatedDocs,
  ListCurrentStudentsDocs,
  ListCurrentStudentsPaginatedDocs,
  RestoreGroupDocs,
  UpdateGroupDocs,
} from 'src/domain/group/swagger/group-swagger.decorator';
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
  @Get(':id/students')
  async listCurrentStudents(
    @Param('id', ParseIntPipe) id: number,
    @Query('isActive') isActive?: string,
  ): Promise<PickedStudentDto[]> {
    return await this.groupService.listStudents(id, isActive);
  }

  @ListCurrentStudentsPaginatedDocs()
  @Get(':id/students/paginated')
  async listCurrentStudentsPaginated(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PickedStudentDto>> {
    return await this.groupService.listStudentsPaginated(id, query);
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

  @Get(':id/booked-students')
  async listBookedStudents(
    @Param('id', ParseIntPipe) id: number,
    @Query('isPending') isPending?: string,
  ): Promise<any[]> {
    return await this.groupService.listBookedStudents(id, isPending);
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
