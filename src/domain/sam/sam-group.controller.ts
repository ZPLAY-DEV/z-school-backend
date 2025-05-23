import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/response/api-error-common.response';
import { Group } from 'src/domain/group/entities/group.entity';
import { SamService } from 'src/domain/sam/sam.service';

@ApiTags('✅ Sam > Group (학교쌤 > 반)')
@ApiCommonErrorResponseTemplate()
@Controller('sams')
export class SamGroupController {
  constructor(private readonly samService: SamService) {}

  //? ---------------------------------------------------------------------- ?//
  //? Create
  //? ---------------------------------------------------------------------- ?//

  @Get(':samId/groups')
  @ApiOperation({ summary: '이 쌤이 관리하는 반 정보들' })
  async list(@Param('samId', ParseIntPipe) samId: number): Promise<Group[]> {
    return await this.samService.list(samId);
  }
}
