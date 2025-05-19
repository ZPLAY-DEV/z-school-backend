import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { EnrollmentRule } from 'src/common/enums';
import { ClassTimeDto } from 'src/domain/offering/dto/class-time.dto';

export class CreateOfferingDto {
  @ApiProperty({ description: '🈳 DB의 학교ID' })
  @IsInt()
  @IsOptional()
  schoolId?: number;

  @ApiProperty({ description: '학교명' })
  @IsString()
  @Length(1, 24)
  schoolName: string;

  @ApiProperty({ description: '과목이름' })
  @IsString()
  @Length(1, 24)
  lessonName: string;

  @ApiProperty({ description: '반이름' })
  @IsString()
  @Length(1, 32)
  groupName: string;

  @ApiProperty({
    description: '요일별 수업 시간 목록',
    type: [ClassTimeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassTimeDto)
  times: ClassTimeDto[];

  @ApiProperty({ description: 'bitmasks (간단 배열)', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  bitmasks: number[];

  @ApiProperty({ description: '허용 학년 목록', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  allowedGrades: number[];

  @ApiProperty({ description: '이전 수강자 ID 목록', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  formerStudentIds: number[];

  @ApiProperty({
    description: '수강신청 방식',
    enum: EnrollmentRule,
    default: EnrollmentRule.FIRST,
  })
  @IsEnum(EnrollmentRule)
  enrollmentRule: EnrollmentRule;

  @ApiProperty({ description: '시간 중복 허용 여부', default: false })
  @IsBoolean()
  allowTimeOverlap: boolean;

  @ApiProperty({ description: '마지막 동기화 시간', type: Number })
  @IsNumber()
  @IsOptional()
  lastSyncTimestamp?: number;
}
