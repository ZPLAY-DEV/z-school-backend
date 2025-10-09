import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Group } from 'src/domain/group/entities/group.entity';
import {
  ResponseSchooldayItemDto,
  ResponseWeeklySchooldayDto,
} from 'src/domain/school/dto/response-student-schoolday.dto';
import { SchoolTermSamService } from 'src/domain/school/school-term-sam.service';
import { ResponseSchoolTermSamOfferingDto } from './dto/response-school-term-sam-offering.dto';
import {
  SchoolTermSamGroupsDocs,
  SchoolTermSamOfferingsDocs,
  SchoolTermSamSchooldaysDocs,
  SchoolTermSamWeeklySchooldaysDocs,
} from './swagger/school-term-sam-swagger.decorator';

@ApiTags('✳️ Schools > Terms > Sams ( 학교 > 학기 > 담임쌤 )')
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermSamController {
  constructor(private readonly schoolTermSamService: SchoolTermSamService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @SchoolTermSamGroupsDocs()
  @Get(':schoolId/terms/:termId/sams/:samId/groups')
  async listGroups(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('samId', ParseIntPipe) samId: number,
  ): Promise<Group[]> {
    return await this.schoolTermSamService.listGroups(schoolId, termId, samId);
  }

  @SchoolTermSamOfferingsDocs()
  @Get(':schoolId/terms/:termId/sams/:samId/offerings')
  async listOfferings(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('samId', ParseIntPipe) samId: number,
  ): Promise<ResponseSchoolTermSamOfferingDto[]> {
    return await this.schoolTermSamService.listOfferings(
      schoolId,
      termId,
      samId,
    );
  }

  @SchoolTermSamSchooldaysDocs()
  @Get(':schoolId/terms/:termId/sams/:samId/schooldays')
  async listSchooldays(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('samId', ParseIntPipe) samId: number,
  ): Promise<ResponseSchooldayItemDto[]> {
    return await this.schoolTermSamService.listSchooldays(
      schoolId,
      termId,
      samId,
    );
  }

  @SchoolTermSamWeeklySchooldaysDocs()
  @Get(':schoolId/terms/:termId/sams/:samId/weekly-schooldays')
  async listWeeklySchooldays(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Param('samId', ParseIntPipe) samId: number,
    @Query('date') date?: string,
  ): Promise<ResponseWeeklySchooldayDto> {
    return await this.schoolTermSamService.listWeeklySchooldays(
      schoolId,
      termId,
      samId,
      date,
    );
  }
}
