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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { Actor, RemovalStatus } from 'src/common/enums';
import { CreateGroupDto } from 'src/domain/group/dto/create-group.dto';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupService } from 'src/domain/group/group.service';
import {
  CreateGroupDocs,
  DeleteGroupDocs,
  FindGroupDocs,
  UpdateGroupDocs,
} from 'src/domain/group/swagger/group-swagger.decorator';
import { Student } from 'src/domain/student/entities/student.entity';

@ApiTags('✅ Groups ( 반 )')
@Controller('groups')
@UseInterceptors(ClassSerializerInterceptor)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateGroupDocs()
  @ApiOperation({ description: '반(Group) 생성' })
  @Post()
  async create(@Body() dto: CreateGroupDto): Promise<Group> {
    return this.groupService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindGroupDocs()
  @ApiOperation({ description: '반(Group) 조회' })
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

  @ApiOperation({ description: '반(Group) 조회' })
  @Get(':id/available-students')
  async findAvailableStudents(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Student[]> {
    return await this.groupService.findAvailableStudents(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateGroupDocs()
  @ApiOperation({ description: '반(Group) 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateGroupDto,
  ): Promise<Group> {
    return await this.groupService.update(id, dto);
  }

  @ApiOperation({ description: '폐강상태 반(Group) 복구' })
  @Put(':id/restore')
  async restore(@Param('id') id: number): Promise<Group> {
    return await this.groupService.restore(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteGroupDocs()
  @ApiOperation({ description: '반(Group) 삭제 w/ 취소 사유' })
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
