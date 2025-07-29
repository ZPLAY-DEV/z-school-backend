import {
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseCreateOfferingPickDto } from 'src/domain/group/dto/response-create-offering-pick.dto';
import { CreateAutoPickDto } from 'src/domain/offering/dto/create-auto-pick.dto';
import { OfferingPickService } from 'src/domain/offering/offering-pick.service';
import {
  CreateAutoPickDocs,
  CreateOfferingPickDocs,
} from 'src/domain/offering/swagger/offering-pick-swagger.decorator';

@ApiTags('✳️ Offerings > Picks ( 수강신청과목 > 수강생 확정 )')
@Controller('offerings')
@UseInterceptors(ClassSerializerInterceptor)
export class OfferingPickController {
  constructor(private readonly offeringPickService: OfferingPickService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @CreateOfferingPickDocs()
  @Post(':offeringId/picks')
  @HttpCode(200)
  async create(
    @Param('offeringId', ParseIntPipe) offeringId: number,
  ): Promise<ResponseCreateOfferingPickDto> {
    return this.offeringPickService.create(offeringId);
  }

  @CreateAutoPickDocs()
  @Post('all/picks')
  @HttpCode(200)
  async createAutoPicks(dto: CreateAutoPickDto): Promise<number[]> {
    return this.offeringPickService.createAutoPicks(dto);
  }
}
