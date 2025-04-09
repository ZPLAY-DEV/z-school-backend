import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { PaginateQueryOptions } from 'src/common/decorators/paginate-query-options.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateManagerDto } from 'src/domain/manager/dto/create-manager.dto';
import { UpdateManagerDto } from 'src/domain/manager/dto/update-manager.dto';
import { Manager as ManagerEntity } from 'src/domain/manager/entities/manager.entity';
import { ManagerService } from 'src/domain/manager/manager.service';
import { UploadService } from 'src/services/upload/upload.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('managers')
export class ManagerController {
  constructor(
    private readonly managerService: ManagerService,
    private readonly uploadService: UploadService,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Manager 생성' })
  @Post()
  async create(
    @CurrentUserId() userId: number,
    @Body() dto: CreateManagerDto,
  ): Promise<ManagerEntity> {
    return await this.managerService.create({ ...dto, userId });
  }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Manager 리스트 w/ Pagination' })
  @PaginateQueryOptions()
  @Public()
  @Get('paginated')
  async getAdminManager(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<ManagerEntity>> {
    return await this.managerService.findAll(query);
  }

  @ApiOperation({ description: '모든 active 배너 리스트' })
  @Public()
  @Get()
  async getActiveManager(): Promise<ManagerEntity[]> {
    return await this.managerService.find();
  }

  @ApiOperation({ description: 'Manager 상세보기' })
  @Get(':id')
  async getManagerById(@Param('id') id: number): Promise<ManagerEntity> {
    return await this.managerService.findById(id, [`user`, `comments`]);
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Manager 수정' })
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateManagerDto,
  ): Promise<ManagerEntity> {
    console.log(dto);
    return await this.managerService.update(id, dto);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  @ApiOperation({ description: 'Manager 삭제' })
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<ManagerEntity> {
    return await this.managerService.remove(id);
  }
}
