import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { GroupStudent } from 'src/domain/group/entities/group-student.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { OfferingGroupStudentService } from 'src/domain/offering/offering-group-student.service';

//! 단일 Offering 엔터티 작업
@ApiTags('✅ Offerings > GroupStudents ( 수강신청과목 > 수강생확정 )')
@ApiCommonErrorResponseTemplate()
@Controller('offerings')
@UseInterceptors(ClassSerializerInterceptor)
export class OfferingGroupStudentController {
  constructor(
    private readonly offeringGroupStudentService: OfferingGroupStudentService,
  ) {}

  //?-------------------------------------------------------------------------//
  //? Create
  //?-------------------------------------------------------------------------//

  @Post(':offeringId/group-students')
  async create(
    @Param('offeringId', ParseIntPipe) offeringId: number,
    @Body() dto: any,
  ): Promise<GroupStudent[]> {
    return this.offeringGroupStudentService.create(offeringId, dto);
  }

  //?-------------------------------------------------------------------------//
  //? Read
  //?-------------------------------------------------------------------------//

  @Public()
  @Get(':offeringId/group-students')
  async getOfferingById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Offering> {
    return await this.offeringGroupStudentService.findById(id, ['bookings']);
  }
}
