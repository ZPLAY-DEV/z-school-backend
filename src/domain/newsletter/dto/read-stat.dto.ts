import { ApiProperty } from '@nestjs/swagger';

export class ReadStatDto {
  @ApiProperty({ description: '학생 ID' })
  id: number;

  @ApiProperty({ description: '학생 이름' })
  name: string;

  @ApiProperty({ description: '학년' })
  grade: number;

  @ApiProperty({ description: '반' })
  class: string;

  @ApiProperty({ description: '학번' })
  studentCode: number;

  @ApiProperty({ description: '뉴스레터 링크', nullable: true })
  link: string | null;

  @ApiProperty({ description: '읽음 여부' })
  read: boolean;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;
}
