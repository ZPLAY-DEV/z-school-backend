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
import { CreateNanoidDto } from 'src/domain/parent/dto/create-nanoid.dto';
import { Nanoid } from 'src/domain/parent/entities/nanoid.entity';
import { ParentNanoidService } from 'src/domain/parent/parent-nanoid.service';
import { CreateNanoidDocs } from 'src/domain/parent/swagger/parent-nanoid.swagger.decorator';

@ApiTags('✅ Parents ( 학부모 ) > Nanoids ( 나노아이디 )')
@Controller('parents')
@UseInterceptors(ClassSerializerInterceptor)
export class ParentNanoidController {
  constructor(private readonly parentNanoidService: ParentNanoidService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateNanoidDocs()
  @Post(':parentId/nanoids')
  async create(
    @Param('parentId', ParseIntPipe) parentId: number,
    @Body() dto: CreateNanoidDto,
  ): Promise<Nanoid> {
    return await this.parentNanoidService.create({ ...dto, parentId });
  }

  //? ---------------------------------------------------------------------- ?//
  //? Update
  //? ---------------------------------------------------------------------- ?//

  //? ---------------------------------------------------------------------- ?//
  //? Delete
  //? ---------------------------------------------------------------------- ?//
}
