import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { SchoolTermService } from 'src/domain/school/school-term.service';
import { CreateTermDto } from 'src/domain/term/dto/create-term.dto';
import { UpdateTermDto } from 'src/domain/term/dto/update-term.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import { ListTermDocs } from 'src/domain/term/swagger/shool-term-swagger.decorator';

@ApiTags('✅ Schools > Terms ( 학교 > 학기 )')
@ApiCommonErrorResponseTemplate()
@Controller('schools')
@UseInterceptors(ClassSerializerInterceptor)
export class SchoolTermController {
  constructor(private readonly schoolTermService: SchoolTermService) {}

  //! ---------------------------------------------------------------------- ?//
  //! todo. (프론트 개발자에게 통보후 삭제)
  //! ---------------------------------------------------------------------- ?//

  @Post(':schoolId/terms')
  async create(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() dto: CreateTermDto,
  ): Promise<Term> {
    return await this.schoolTermService.create({
      ...dto,
      schoolId: schoolId,
    });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @ListTermDocs()
  @Get(':schoolId/terms')
  async list(
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ): Promise<Term[]> {
    return await this.schoolTermService.list(schoolId);
  }

  // pagination 을 할 정도로 데이터가 많지 않아서 제공 보류
  //
  // @PaginatedTermDocs()
  // @Get(':schoolId/terms/paginated')
  // async infiniteList(
  //   @Param('schoolId', ParseIntPipe) schoolId: number,
  //   @Paginate() query: PaginateQuery,
  // ): Promise<Paginated<Term>> {
  //   return await this.schoolTermService.infiniteList(schoolId, query);
  // }

  //! ---------------------------------------------------------------------- ?//
  //! todo (프론트 개발자에게 통보후 삭제)
  //! ---------------------------------------------------------------------- ?//

  @Patch(':schoolId/terms/:termId')
  async update(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Param('termId', ParseIntPipe) termId: number,
    @Body() dto: UpdateTermDto,
  ): Promise<Term> {
    return await this.schoolTermService.update(termId, { ...dto, schoolId });
  }
}
