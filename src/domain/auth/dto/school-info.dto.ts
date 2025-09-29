import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SchoolInfo {
  @ApiProperty({ description: '학교 ID', example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ description: '학교 이름', example: '서울초등학교' })
  @Expose()
  name: string;

  @ApiProperty({ description: '학교 코드', example: '7872025' })
  @Expose()
  schoolCode: string;

  @ApiProperty({ description: '지역', example: 'SEOUL' })
  @Expose()
  region: string;

  @ApiProperty({
    description: '주소',
    example: '서울특별시 강남구 역삼동 123-45',
    required: false,
  })
  @Expose()
  address?: string | null;
}
