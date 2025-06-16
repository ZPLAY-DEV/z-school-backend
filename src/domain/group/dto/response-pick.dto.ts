import { ApiProperty } from '@nestjs/swagger';
import { PickRule } from 'src/common/enums';

export class ResponsePickDto {
  @ApiProperty({
    description: '수강신청 규칙',
    enum: PickRule,
    example: PickRule.FIRST,
  })
  pickRule: PickRule;

  @ApiProperty({ description: '정원수', example: 20 })
  capacity: number;

  @ApiProperty({ description: '수강확정 인원수', example: 18 })
  filled: number;

  @ApiProperty({ description: '빈자리수', example: 2 })
  unfilled: number;

  constructor(partial: Partial<ResponsePickDto>) {
    Object.assign(this, partial);
  }
}
