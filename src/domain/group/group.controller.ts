import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RemovalStatus } from 'src/common/enums';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
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
} from 'src/domain/group/swagger/rest-swagger.decorator';
@ApiTags('✅ Groups ( 반 )')
@ApiCommonErrorResponseTemplate()
@Controller('groups')
@UseInterceptors(ClassSerializerInterceptor)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  //?-------------------------------------------------------------------------//
  //? Create
  //?-------------------------------------------------------------------------//

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
      'groupStudents',
      'groupStudents.student',
    ]);
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

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteGroupDocs()
  @ApiOperation({ description: '반(Group) 삭제 w/ 취소 사유' })
  @Delete(':id')
  async remove(
    @Param('id') id: number,
    @Body() dto: DeleteGroupDto,
  ): Promise<RemovalStatus> {
    return await this.groupService.remove(id, dto);
  }
}
