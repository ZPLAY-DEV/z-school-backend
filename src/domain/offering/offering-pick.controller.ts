import {
  Body,
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
import { SchoolTermDto } from 'src/domain/offering/dto/school-term.dto';
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

  @Post('all/notify')
  @HttpCode(200)
  async notify(@Body() dto: SchoolTermDto) {
    console.log('🚀 dto', dto);
    return this.offeringPickService.notify(dto);
  }

  @CreateAutoPickDocs()
  @Post('all/picks')
  @HttpCode(200)
  async createAutoPicks(@Body() dto: SchoolTermDto): Promise<number[]> {
    console.log('🚀 dto', dto);
    return this.offeringPickService.createAutoPicks(dto);
  }

  @CreateOfferingPickDocs()
  @Post(':offeringId/picks')
  @HttpCode(200)
  async create(
    @Param('offeringId', ParseIntPipe) offeringId: number,
  ): Promise<ResponseCreateOfferingPickDto> {
    return this.offeringPickService.create(offeringId);
  }
}
