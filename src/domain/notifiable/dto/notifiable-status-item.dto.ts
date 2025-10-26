import { ApiProperty } from '@nestjs/swagger';
import { NotifiableSourceType } from 'src/common/enums';

export class NotifiableStatusItemDto {
  @ApiProperty({ description: '학생 ID' })
  id: number;

  @ApiProperty({ description: '학생 이름' })
  name: string;

  @ApiProperty({ description: '학년' })
  grade: number;

  @ApiProperty({ description: '반' })
  klass: string;

  @ApiProperty({ description: '학번' })
  bunho: number;

  @ApiProperty({ description: '링크', nullable: true })
  link: string | null;

  @ApiProperty({ description: '발송 원천 타입' })
  type: NotifiableSourceType;

  @ApiProperty({
    description: '열람 시각 (읽음 여부 확인용)',
    example: '2025-06-26T00:30:00Z',
    nullable: true,
  })
  readAt: Date | null;

  @ApiProperty({
    description: '응답 시각 (Survey의 경우)',
    example: '2025-06-26T00:30:00Z',
    nullable: true,
  })
  answeredAt: Date | null;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;
}
