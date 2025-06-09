import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { CreateNanoIdDto } from 'src/domain/parent/dto/create-nanoid.dto';
import { NanoId } from 'src/domain/parent/entities/nanoid.entity';
import { ParentNanoIdService } from 'src/domain/parent/parent-nanoid.service';
import { CreateNanoIdDocs } from 'src/domain/parent/swagger/parent-nanoid.swagger.decorator';

@ApiTags('✅ Parents ( 학부모 ) > NanoIds ( 나노아이디 )')
@ApiCommonErrorResponseTemplate()
@Controller('parents')
@UseInterceptors(ClassSerializerInterceptor)
export class ParentNanoIdController {
  constructor(private readonly parentNanoIdService: ParentNanoIdService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateNanoIdDocs()
  @Post(':parentId/nanoids')
  async create(
    @Param('parentId', ParseIntPipe) parentId: number,
    @Body() dto: CreateNanoIdDto,
  ): Promise<NanoId> {
    return await this.parentNanoIdService.create({ ...dto, parentId });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//
}
