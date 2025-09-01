import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { CreateDispatchDto } from 'src/domain/newsletter/dto/create-dispatch.dto';

export class UpdateDispatchDto extends PartialType(
  OmitType(CreateDispatchDto, ['newsletterId'] as const),
) {
  @ApiProperty({
    description:
      '📝 발송 수정용 DTO - 모든 필드가 선택사항이며 newsletterId는 수정 불가',
    example: {
      target: 'GRADE',
      targetItems: [3, 4],
      targetLabel: '3, 4학년',
      scheduledAt: '2025-02-15T09:00:00Z',
      status: 'SCHEDULED',
    },
  })
  declare target?: any;
}
