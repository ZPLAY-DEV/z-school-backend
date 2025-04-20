import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length
} from 'class-validator';
import { EnrollmentRule, Weekday } from 'src/common/enums';

export class CreateOfferingDto {
  @ApiProperty({ description: '🈳 DB의 학교ID' })
  @IsInt()
  @IsOptional()
  schoolId: number;

  @ApiProperty({ description: '학교명' })
  @IsString()
  @Length(1, 32)
  schoolName: string;

  @ApiProperty({ description: '과목이름' })
  @IsString()
  @Length(1, 16)
  lessonName: string;

  @ApiProperty({ description: '반이름' })
  @IsString()
  @Length(1, 16)
  groupName: string;

  @ApiProperty({ description: '🈵 요일', enum: Weekday })
  @IsEnum(Weekday)
  weekday: Weekday;

  @ApiProperty({ description: '🈵 시작시각 (HH:mm)' })
  @IsString()
  @Length(4, 5)
  started: string;

  @ApiProperty({ description: '🈵 종료시각 (HH:mm)' })
  @IsString()
  @Length(4, 5)
  ended: string;

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
    default: EnrollmentRule.FIRST_COME,
  })
  @IsEnum(EnrollmentRule)
  enrollmentRule: EnrollmentRule;

  @ApiProperty({ description: '시간 중복 허용 여부', default: false })
  @IsBoolean()
  allowTimeOverlap: boolean;
}
