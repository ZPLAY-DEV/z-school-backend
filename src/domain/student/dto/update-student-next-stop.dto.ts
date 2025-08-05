import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

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

/**
 * 학생 하교장소 수정 DTO
 * 요일별로 하교 후 가는 장소와 함께 가는 사람 정보를 담습니다.
 */
export class UpdateStudentNextStopDto {
  @ApiProperty({
    description: '월요일 하교장소 정보',
    type: DailyNextStopDto,
  })
  @ValidateNested()
  @Type(() => DailyNextStopDto)
  MON: DailyNextStopDto;

  @ApiProperty({
    description: '화요일 하교장소 정보',
    type: DailyNextStopDto,
  })
  @ValidateNested()
  @Type(() => DailyNextStopDto)
  TUE: DailyNextStopDto;

  @ApiProperty({
    description: '수요일 하교장소 정보',
    type: DailyNextStopDto,
  })
  @ValidateNested()
  @Type(() => DailyNextStopDto)
  WED: DailyNextStopDto;

  @ApiProperty({
    description: '목요일 하교장소 정보',
    type: DailyNextStopDto,
  })
  @ValidateNested()
  @Type(() => DailyNextStopDto)
  THU: DailyNextStopDto;

  @ApiProperty({
    description: '금요일 하교장소 정보',
    type: DailyNextStopDto,
  })
  @ValidateNested()
  @Type(() => DailyNextStopDto)
  FRI: DailyNextStopDto;

  @ApiProperty({
    description: '토요일 하교장소 정보',
    type: DailyNextStopDto,
  })
  @ValidateNested()
  @Type(() => DailyNextStopDto)
  SAT: DailyNextStopDto;
}
