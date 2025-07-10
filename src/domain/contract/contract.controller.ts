import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserIdAndRole } from 'src/common/decorators/current-user-id.decorator';
import { Actor } from 'src/common/enums';
import { ContractService } from 'src/domain/contract/contract.service';
import {
  EndContractDto,
  StartContractDto,
} from 'src/domain/contract/dto/create-contract.dto';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import {
  DeleteContractDocs,
  EndContractDocs,
  ListGroupsDocs,
  ListSamsDocs,
  PaginatedListGroupsDocs,
  PaginatedListSamsDocs,
  StartContractDocs,
  UpdateContractDocs,
} from 'src/domain/contract/swagger/contract-swagger.decorator';
import { UpdateGroupDto } from 'src/domain/group/dto/update-group.dto';

@ApiTags('✳️ Contracts ( 담임쌤; 반·쌤 pivot )')
@Controller('contracts')
@UseInterceptors(ClassSerializerInterceptor)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @StartContractDocs()
  @HttpCode(200)
  @Post('start')
  async createContract(
    @Body() dto: StartContractDto,
    @CurrentUserIdAndRole() user: { id: number; role: string },
  ): Promise<Contract> {
    const role = user.role === 'MANAGER' ? Actor.MANAGER : Actor.OTHER;
    return await this.contractService.createContract({
      ...dto,
      startedBy: role,
    });
  }

  @EndContractDocs()
  @HttpCode(200)
  @Post('end')
  async endContract(
    @Body() dto: EndContractDto,
    @CurrentUserIdAndRole() user: { id: number; role: string },
  ): Promise<Contract> {
    const role = user.role === 'MANAGER' ? Actor.MANAGER : Actor.OTHER;
    return await this.contractService.endContract({
      ...dto,
      endedBy: role,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ListSamsDocs()
  @Get('lessons/:lessonId')
  async getStudentList(
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ): Promise<Contract[]> {
    return await this.contractService.listSams(lessonId);
  }

  @PaginatedListSamsDocs()
  @Get('lessons/:lessonId/paginated')
  async getStudentInfiniteList(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Query() query: PaginateQuery,
  ): Promise<Paginated<Contract>> {
    return await this.contractService.infiniteListSams(lessonId, query);
  }

  @ListGroupsDocs()
  @Get('sams/:samId')
  async getGroupList(
    @Param('samId', ParseIntPipe) samId: number,
  ): Promise<Contract[]> {
    return await this.contractService.listGroups(samId);
  }

  @PaginatedListGroupsDocs()
  @Get('sams/:samId/paginated')
  async getGroupInfiniteList(
    @Param('samId', ParseIntPipe) samId: number,
    @Query() query: PaginateQuery,
  ): Promise<Paginated<Contract>> {
    return await this.contractService.infiniteListGroups(samId, query);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  @UpdateContractDocs()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
  ): Promise<Contract> {
    return await this.contractService.update(id, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//

  @DeleteContractDocs()
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Contract> {
    return await this.contractService.remove(id);
  }
}
