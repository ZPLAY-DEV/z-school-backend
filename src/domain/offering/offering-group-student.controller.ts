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
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateOfferingDto } from 'src/domain/offering/dto/create-offering.dto';
import { UpdateOfferingDto } from 'src/domain/offering/dto/update-offering.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { OfferingService } from 'src/domain/offering/offering.service';
import {
  CreateOfferingDocs,
  GetOfferingByIdDocs,
  RemoveOfferingDocs,
  UpdateOfferingDocs,
} from 'src/domain/offering/swagger/offering-swagger.decorator';

//! 단일 Offering 엔터티 작업
@ApiTags('✅ Offerings > GroupStudents ( 수강신청과목 )')
@ApiCommonErrorResponseTemplate()
@Controller('offerings')
@UseInterceptors(ClassSerializerInterceptor)
export class OfferingGroupStudentController {
  constructor(private readonly offeringService: OfferingService) {}

  //?-------------------------------------------------------------------------//
  //? Create
  //?-------------------------------------------------------------------------//

  @CreateOfferingDocs()
  @Post()
  async create(@Body() dto: CreateOfferingDto): Promise<Offering> {
    return this.offeringService.create(dto);
  }

  //?-------------------------------------------------------------------------//
  //? Read
  //?-------------------------------------------------------------------------//

  @GetOfferingByIdDocs()
  @Public()
  @Get(':id')
  async getOfferingById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Offering> {
    return await this.offeringService.findById(id, ['bookings']);
  }

  //?-------------------------------------------------------------------------//
  //? Update
  //?-------------------------------------------------------------------------//

  @UpdateOfferingDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOfferingDto,
  ): Promise<Offering> {
    return await this.offeringService.update(id, dto);
  }

  //?-------------------------------------------------------------------------//
  //? Delete
  //?-------------------------------------------------------------------------//

  @RemoveOfferingDocs()
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Offering> {
    return await this.offeringService.softRemove(id);
  }
}
