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
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateOfferingDto } from 'src/domain/offering/dto/create-offering.dto';
import { UpdateOfferingDto } from 'src/domain/offering/dto/update-offering.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { OfferingService } from 'src/domain/offering/offering.service';
import {
  CreateOfferingDocs,
  FindImmediatelyPreviousTermIdDocs,
  GetOfferingByIdDocs,
  RemoveOfferingDocs,
  SetFormerStudentIdsDocs,
  UpdateOfferingDocs,
} from 'src/domain/offering/swagger/offering-swagger.decorator';

//! 단일 Offering 엔터티 작업
@ApiTags('✅ Offerings ( 수강신청과목 )')
@ApiCommonErrorResponseTemplate()
@Controller('offerings')
@UseInterceptors(ClassSerializerInterceptor)
export class OfferingController {
  constructor(private readonly offeringService: OfferingService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateOfferingDocs()
  @Post()
  async create(@Body() dto: CreateOfferingDto): Promise<Offering> {
    return this.offeringService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @GetOfferingByIdDocs()
  @Get(':id')
  async getOfferingById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Offering> {
    return await this.offeringService.findById(id, ['bookings']);
  }

  @FindImmediatelyPreviousTermIdDocs()
  @Get(':id/previous-term-id')
  async findImmediatelyPreviousTermId(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<number> {
    return await this.offeringService.findImmediatelyPreviousTermId(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateOfferingDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOfferingDto,
  ): Promise<Offering> {
    return await this.offeringService.update(id, dto);
  }

  @SetFormerStudentIdsDocs()
  @Patch(':id/former-student-ids')
  async setFormerStudentIds(
    @Param('id', ParseIntPipe) id: number,
    @Body('offeringIds') offeringIds: number[],
  ): Promise<number[]> {
    return await this.offeringService.setFormerStudentIds(id, offeringIds);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @RemoveOfferingDocs()
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Offering> {
    return await this.offeringService.softRemove(id);
  }
}
