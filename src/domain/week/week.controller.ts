import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateWeekDto } from './dto/create-week.dto';
import { UpdateWeekDto } from './dto/update-week.dto';
import { Week } from './entities/week.entity';
import { WeekService } from './week.service';

@ApiTags('Week')
@Controller('weeks')
export class WeekController {
  constructor(private readonly weekService: WeekService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post()
  @ApiOperation({ summary: 'Week 생성' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Week가 성공적으로 생성됨',
    type: Week,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  async create(@Body() createWeekDto: CreateWeekDto): Promise<Week> {
    return await this.weekService.create(createWeekDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Week 대량 생성' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Week들이 성공적으로 생성됨',
    type: [Week],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '일부 syllabus를 찾을 수 없음',
  })
  async createBulk(@Body() createWeekDtos: CreateWeekDto[]): Promise<Week[]> {
    return await this.weekService.createBulk(createWeekDtos);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get()
  @ApiOperation({ summary: '전체 Week 조회 또는 Syllabus별 Week 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Week 목록이 성공적으로 조회됨',
    type: [Week],
  })
  async findAll(
    @Query('syllabusId', new ParseIntPipe({ optional: true }))
    syllabusId?: number,
  ): Promise<Week[]> {
    if (syllabusId) {
      return await this.weekService.findBySyllabus(syllabusId);
    }
    return await this.weekService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '특정 Week 상세 조회' })
  @ApiParam({ name: 'id', description: 'Week ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Week가 성공적으로 조회됨',
    type: Week,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 Week를 찾을 수 없음',
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Week> {
    return await this.weekService.findOne(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @Patch(':id')
  @ApiOperation({ summary: 'Week 수정' })
  @ApiParam({ name: 'id', description: 'Week ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Week가 성공적으로 수정됨',
    type: Week,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 Week를 찾을 수 없음',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWeekDto: UpdateWeekDto,
  ): Promise<Week> {
    return await this.weekService.update(id, updateWeekDto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Week 삭제 (soft delete)' })
  @ApiParam({ name: 'id', description: 'Week ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Week가 성공적으로 삭제됨',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 Week를 찾을 수 없음',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.weekService.remove(id);
  }
}
