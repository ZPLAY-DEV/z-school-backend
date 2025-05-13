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
import { ApiTags } from '@nestjs/swagger';
import { RemovalStatus } from 'src/common/enums';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { DeleteGroupDto } from 'src/domain/group/dto/delete-group.dto';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';
import { Group } from 'src/domain/group/entities/group.entity';
import { GroupStudentService } from 'src/domain/group/group-student.service';
import {
  DeleteGroupDocs,
  FindGroupDocs,
} from 'src/domain/group/swagger/rest-swagger.decorator';
@ApiTags('✅ Groups > Students ( 반 > 수강생 )')
@ApiCommonErrorResponseTemplate()
@Controller('groups')
@UseInterceptors(ClassSerializerInterceptor)
export class GroupStudentController {
  constructor(private readonly groupStudentService: GroupStudentService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindGroupDocs()
  @Get(':groupId/students')
  async findById(@Param('id') id: number): Promise<Group> {
    return await this.groupStudentService.findById(id, [
      'groupStudents',
      'groupStudents.student',
    ]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @Patch(':groupId/students/:studentId')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateGroupDto,
  ): Promise<Group> {
    return await this.groupStudentService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteGroupDocs()
  @Delete(':groupId/students/:studentId')
  async remove(
    @Param('id') id: number,
    @Body() dto: DeleteGroupDto,
  ): Promise<RemovalStatus> {
    return await this.groupStudentService.remove(id, dto);
  }
}
