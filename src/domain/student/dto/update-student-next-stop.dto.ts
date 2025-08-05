import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * 요일별 하교장소 정보 DTO
 */
export class DailyNextStopDto {
  @ApiProperty({
    description: '하교 후 가는 장소',
    type: String,
    example: '당구장',
  })
  @IsString({ message: '장소는 문자열이어야 합니다' })
  place: string;

  @ApiProperty({
    description: '함께 가는 사람 이름 (nullable)',
    type: String,
    example: '친구',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: '이름은 문자열이어야 합니다' })
  name?: string | null;

  @ApiProperty({
    description: '함께 가는 사람 전화번호 (nullable)',
    type: String,
    example: '01012340001',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: '전화번호는 문자열이어야 합니다' })
  phone?: string | null;
}
