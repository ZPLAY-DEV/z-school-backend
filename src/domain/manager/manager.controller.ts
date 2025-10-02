import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { UpdateManagerDto } from 'src/domain/manager/dto/update-manager.dto';
import { Manager as ManagerEntity } from 'src/domain/manager/entities/manager.entity';
import { ManagerService } from 'src/domain/manager/manager.service';
import {
    DeleteManagerDocs,
    GetActiveManagersDocs,
    GetManagerByIdDocs,
    GetManagersPaginatedDocs,
    UpdateManagerDocs,
} from './swagger/manager.swagger.decorator';

@ApiTags('✳️ Managers ( 관리자 )')
@Controller('managers')
@UseInterceptors(ClassSerializerInterceptor)
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @GetManagersPaginatedDocs()
  @Public()
  @Get('paginated')
  async infiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<ManagerEntity>> {
    return await this.managerService.infiniteList(query);
  }

  @GetActiveManagersDocs()
  @Public()
  @Get()
  async list(): Promise<ManagerEntity[]> {
    return await this.managerService.list();
  }

  @GetManagerByIdDocs()
  @Get(':id')
  async getManagerById(@Param('id') id: number): Promise<ManagerEntity> {
    return await this.managerService.findById(id, [`user`, `affiliations`]);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateManagerDocs()
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateManagerDto,
  ): Promise<ManagerEntity> {
    console.log(dto);
    return await this.managerService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteManagerDocs()
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<ManagerEntity> {
    return await this.managerService.remove(id);
  }
}
