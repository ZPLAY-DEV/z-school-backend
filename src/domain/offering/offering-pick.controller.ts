import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { ResponsePickDto } from 'src/domain/group/dto/response-pick.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { OfferingPickService } from 'src/domain/offering/offering-pick.service';

//! 단일 Offering 엔터티 작업
@ApiTags('✅ Offerings > Picks ( 수강신청과목 > 수강생확정 )')
@ApiCommonErrorResponseTemplate()
@Controller('offerings')
@UseInterceptors(ClassSerializerInterceptor)
export class OfferingPickController {
  constructor(private readonly offeringPickService: OfferingPickService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Post(':offeringId/picks')
  async create(
    @Param('offeringId', ParseIntPipe) offeringId: number,
  ): Promise<ResponsePickDto> {
    return this.offeringPickService.create(offeringId);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Read
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @Get(':offeringId/picks')
  async list(@Param('id', ParseIntPipe) id: number): Promise<Offering> {
    return await this.offeringPickService.findById(id, ['bookings']);
  }
}
