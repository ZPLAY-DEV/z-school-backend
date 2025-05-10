import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RemovalStatus } from 'src/common/enums';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupService } from 'src/domain/group/group.service';
import {
  DeleteGroupDocs,
  FindGroupDocs,
} from 'src/domain/group/swagger/rest-swagger.decorator';
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Group ( 반 )')
@ApiCommonErrorResponseTemplate()
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindGroupDocs()
  @ApiOperation({ description: 'Group 조회' })
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

  @ApiOperation({ description: 'Group 수정' })
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
  @ApiOperation({ description: 'Group 삭제' })
  @Delete(':id')
  async remove(
    @Param('id') id: number,
    @Body() dto: DeleteGroupDto,
  ): Promise<RemovalStatus> {
    return await this.groupService.remove(id, dto);
  }
}
