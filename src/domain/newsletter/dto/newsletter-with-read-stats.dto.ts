import { ApiProperty } from '@nestjs/swagger';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { ReadStatDto } from './read-stat.dto';

export class NewsletterWithReadStatsDto
  implements
    Pick<
      Newsletter,
      | 'id'
      | 'schoolId'
      | 'termId'
      | 'schoolName'
      | 'termName'
      | 'title'
      | 'body'
      | 'images'
      | 'type'
      | 'createdAt'
      | 'updatedAt'
    >
{
  @ApiProperty({ description: '뉴스레터 ID' })
  id: number;

  @ApiProperty({ description: '학교 ID' })
  schoolId: number;

  @ApiProperty({ description: '학기 ID' })
  termId: number;

  @ApiProperty({ description: '학교명' })
  schoolName: string;

  @ApiProperty({ description: '학기명' })
  termName: string;

  @ApiProperty({ description: '뉴스레터 제목', nullable: true })
  title: string | null;

  @ApiProperty({ description: '뉴스레터 본문', nullable: true })
  body: string | null;

  @ApiProperty({
    description: '첨부 이미지 URL 배열',
    nullable: true,
    type: [String],
  })
  images: string[] | null;

  @ApiProperty({ description: '뉴스레터 타입' })
  type: Newsletter['type'];

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;

  @ApiProperty({
    description: '학생별 읽음 통계',
    type: () => [ReadStatDto],
    nullable: true,
  })
  readStats?: ReadStatDto[];

  @ApiProperty({
    description: '전체 발송 대상 학생 수',
    nullable: true,
  })
  total?: number;

  constructor(partial: Partial<NewsletterWithReadStatsDto>) {
    Object.assign(this, partial);
  }
}
