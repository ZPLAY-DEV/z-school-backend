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

import { CreateOfferingDto } from 'src/domain/offering/dto/create-offering.dto';
import { UpdateOfferingDto } from 'src/domain/offering/dto/update-offering.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { OfferingService } from 'src/domain/offering/offering.service';
import {
  CreateOfferingDocs,
  GetFormerStudentsDocs,
  GetOfferingByIdDocs,
  RemoveOfferingDocs,
  UpdateOfferingDocs,
} from 'src/domain/offering/swagger/offering-swagger.decorator';
import { Student } from 'src/domain/student/entities/student.entity';

//! 단일 Offering 엔터티 작업
@ApiTags('✅ Offerings ( 수강신청과목 )')
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
    return await this.offeringService.findById(id, [
      'bookings',
      'bookings.student',
    ]);
  }

  @GetFormerStudentsDocs()
  @Get(':id/former-students')
  async getFormerStudents(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Student[]> {
    return await this.offeringService.findFormerStudents(id);
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

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @RemoveOfferingDocs()
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Offering> {
    return await this.offeringService.softRemove(id);
  }
}
