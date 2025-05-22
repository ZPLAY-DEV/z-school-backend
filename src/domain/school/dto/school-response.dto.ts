import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from 'src/common/enums/message-type';
import { Permission } from 'src/common/enums/permission';

export class SchoolResponseDto {
  @ApiProperty({
    description: '학교 ID',
    example: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: '학교 이름',
    example: '제트학교',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: '학교 코드',
    example: '212121',
    type: String,
  })
  schoolCode: string;

  @ApiProperty({
    description: '관할 교육청 코드',
    example: 'K14',
    type: String,
  })
  authorityCode: string;

  @ApiProperty({
    description: '학교 주소',
    example: '서울특별시 을지로 10길',
    type: String,
  })
  address: string;

  @ApiProperty({
    description: '운영 비용 규칙',
    example:
      'Operation fee rule (CO: same cost without changes, MC/MF: calculated by ratio)',
    type: String,
  })
  operationFeeRule: string;

  @ApiProperty({
    description: '지급 비율 ( 0 - 100 )',
    example: 100,
    type: Number,
  })
  payoutRate: number;

  @ApiProperty({
    description: '학교 권한',
    enum: Permission,
    isArray: true,
    example: [Permission.ALLOW_INSTRUCTOR_ADD_STUDENT],
  })
  permissions: Permission[];

  @ApiProperty({
    description: '프로모션 비디오 URL',
    example: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    type: [String],
  })
  promos: string[];

  @ApiProperty({
    description: '학교 옵션',
    enum: MessageType,
    example: MessageType.ALL,
  })
  messageType: MessageType;

  @ApiProperty({
    description: '생성된 시기 (ISO 형식의 날짜 문자열)',
    type: Date,
    example: '2025-04-29T05:08:56.706Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정일',
    example: '2021-01-01',
    type: Date,
  })
  updatedAt: Date;
}
