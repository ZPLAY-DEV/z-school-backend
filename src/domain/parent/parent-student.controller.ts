import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ParentStudentService } from './parent-student.service';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { Parent } from './entities/parent.entity';
import { ParentStudentListDocs } from './swagger/parent-student.swagger.decorator';

@ApiTags('✅ Parents ( 학부모 ) > Students ( 학생 )')
@ApiCommonErrorResponseTemplate()
@Controller('parents')
@UseInterceptors(ClassSerializerInterceptor)
export class ParentStudentController {
  constructor(private readonly parentStudentService: ParentStudentService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//
  @ParentStudentListDocs()
  @Get(':parentId/students')
  async list(
    @Param('parentId', ParseIntPipe) parentId: number,
  ): Promise<Parent[]> {
    return this.parentStudentService.list(parentId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//
}
