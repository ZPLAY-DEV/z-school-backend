import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSubsidyDto } from 'src/domain/subsidy/dto/create-subsidy.dto';
import { UpdateSubsidyDto } from 'src/domain/subsidy/dto/update-subsidy.dto';
import { Subsidy } from 'src/domain/subsidy/entities/subsidy.entity';
import { SubsidyService } from 'src/domain/subsidy/subsidy.service';

@ApiTags('⚠️ Subsidies ( 학생지원금 )')
@Controller('subsidies')
export class SubsidyController {
  constructor(private readonly subsidyService: SubsidyService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Subsidy 생성' })
  @Post()
  async create(@Body() dto: CreateSubsidyDto): Promise<Subsidy> {
    return await this.subsidyService.create(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'Subsidy 수정' })
  @Patch(':subsidyId')
  async update(
    @Param('subsidyId', ParseIntPipe) subsidyId: number,
    @Body() dto: UpdateSubsidyDto,
  ): Promise<Subsidy> {
    return await this.subsidyService.update(subsidyId, dto);
  }
}
