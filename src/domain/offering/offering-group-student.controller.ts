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
import { CreateOfferingDto } from 'src/domain/offering/dto/create-offering.dto';
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
  async create(@Body() dto: CreateOfferingDto): Promise<Offering> {
    return this.offeringGroupStudentService.create(dto);
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
