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
import { ApiTags } from '@nestjs/swagger';
import { CreateDepartureBulkDto } from 'src/domain/departure/dto/create-departure-bulk.dto';
import { DepartureService } from './departure.service';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { UpdateDepartureDto } from './dto/update-departure.dto';
import { Departure } from './entities/departure.entity';
import {
  CreateDepartureBulkDocs,
  CreateDepartureDocs,
  DeleteDepartureDocs,
  FindAllDeparturesDocs,
  FindDepartureByDateDocs,
  FindDepartureByStudentDocs,
  FindOneDepartureDocs,
  UpdateDepartureDocs,
} from './swagger/departure-swagger.decorator';

@ApiTags('✳️ Departure ( 하교기록 )')
@Controller('departures')
@UseInterceptors(ClassSerializerInterceptor)
export class DepartureController {
  constructor(private readonly departureService: DepartureService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateDepartureDocs()
  @Post()
  async create(
    @Body() createDepartureDto: CreateDepartureDto,
  ): Promise<Departure> {
    return await this.departureService.create(createDepartureDto);
  }

  @CreateDepartureBulkDocs()
  @Post('bulk')
  async createBulk(@Body() dto: CreateDepartureBulkDto): Promise<Departure[]> {
    return await this.departureService.createBulk(dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @FindAllDeparturesDocs()
  @Get()
  async findAll(): Promise<Departure[]> {
    return await this.departureService.findAll();
  }

  @FindDepartureByStudentDocs()
  @Get('students/:studentId')
  async findByStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<Departure[]> {
    return await this.departureService.findByStudent(studentId);
  }

  @FindDepartureByDateDocs()
  @Get('dates')
  async findByDate(@Query('date') date: string): Promise<Departure[]> {
    return await this.departureService.findByDate(date);
  }

  @FindOneDepartureDocs()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Departure> {
    return await this.departureService.findOne(id);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateDepartureDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDepartureDto: UpdateDepartureDto,
  ): Promise<Departure> {
    return await this.departureService.update(id, updateDepartureDto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteDepartureDocs()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.departureService.remove(id);
  }
}
