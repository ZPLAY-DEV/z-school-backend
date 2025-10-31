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
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Program } from './entities/program.entity';
import { ProgramService } from './program.service';

@ApiTags('Program')
@Controller('programs')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Post()
  @ApiOperation({ summary: '프로그램 생성' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '프로그램이 성공적으로 생성됨',
    type: Program,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 커리큘럼을 찾을 수 없음',
  })
  async create(@Body() createProgramDto: CreateProgramDto): Promise<Program> {
    return await this.programService.create(createProgramDto);
  }

  @Get()
  @ApiOperation({ summary: '전체 프로그램 조회 또는 커리큘럼별 프로그램 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '프로그램 목록이 성공적으로 조회됨',
    type: [Program],
  })
  async findAll(
    @Query('syllabusId', new ParseIntPipe({ optional: true }))
    syllabusId?: number,
  ): Promise<Program[]> {
    if (syllabusId) {
      return await this.programService.findByCurriculum(syllabusId);
    }
    return await this.programService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 프로그램 상세 조회' })
  @ApiParam({ name: 'id', description: '프로그램 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '프로그램이 성공적으로 조회됨',
    type: Program,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 프로그램을 찾을 수 없음',
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Program> {
    return await this.programService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '프로그램 수정' })
  @ApiParam({ name: 'id', description: '프로그램 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '프로그램이 성공적으로 수정됨',
    type: Program,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 프로그램을 찾을 수 없음',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProgramDto: UpdateProgramDto,
  ): Promise<Program> {
    return await this.programService.update(id, updateProgramDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '프로그램 삭제 (soft delete)' })
  @ApiParam({ name: 'id', description: '프로그램 ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '프로그램이 성공적으로 삭제됨',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 프로그램을 찾을 수 없음',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.programService.remove(id);
  }
}
