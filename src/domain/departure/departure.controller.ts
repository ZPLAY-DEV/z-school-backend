import {
  Body,
  ClassSerializerInterceptor,
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
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DepartureService } from './departure.service';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { UpdateDepartureDto } from './dto/update-departure.dto';
import { Departure } from './entities/departure.entity';

@ApiTags('Departure ( 하교기록 )')
@Controller('departures')
@UseInterceptors(ClassSerializerInterceptor)
export class DepartureController {
  constructor(private readonly departureService: DepartureService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post()
  @ApiOperation({ summary: '하교 기록 생성' })
  @ApiResponse({
    status: 201,
    description: '하교 기록이 성공적으로 생성되었습니다.',
    type: Departure,
  })
  async create(
    @Body() createDepartureDto: CreateDepartureDto,
  ): Promise<Departure> {
    return await this.departureService.create(createDepartureDto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Get()
  @ApiOperation({ summary: '모든 하교 기록 조회' })
  @ApiResponse({
    status: 200,
    description: '하교 기록 목록',
    type: [Departure],
  })
  async findAll(): Promise<Departure[]> {
    return await this.departureService.findAll();
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: '특정 학생의 하교 기록 조회' })
  @ApiResponse({
    status: 200,
    description: '학생의 하교 기록 목록',
    type: [Departure],
  })
  async findByStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Departure[]> {
    return await this.departureService.findByStudent(studentId);
  }

  @Get('date')
  @ApiOperation({ summary: '특정 날짜의 하교 기록 조회' })
  @ApiResponse({
    status: 200,
    description: '특정 날짜의 하교 기록 목록',
    type: [Departure],
  })
  async findByDate(@Query('date') date: string): Promise<Departure[]> {
    return await this.departureService.findByDate(date);
  }

  @Get(':id')
  @ApiOperation({ summary: '하교 기록 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '하교 기록 상세 정보',
    type: Departure,
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Departure> {
    return await this.departureService.findOne(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @Patch(':id')
  @ApiOperation({ summary: '하교 기록 수정' })
  @ApiResponse({
    status: 200,
    description: '하교 기록이 성공적으로 수정되었습니다.',
    type: Departure,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDepartureDto: UpdateDepartureDto,
  ): Promise<Departure> {
    return await this.departureService.update(id, updateDepartureDto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '하교 기록 삭제' })
  @ApiResponse({
    status: 204,
    description: '하교 기록이 성공적으로 삭제되었습니다.',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.departureService.remove(id);
  }
}
