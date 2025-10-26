import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { ClassStatus, PickRule, Weekday } from 'src/common/enums';

export class ClassTimeDto {
  @ApiProperty({ enum: Weekday })
  @IsEnum(Weekday)
  weekday: Weekday;

  @ApiProperty({ example: '15:00' })
  @IsString()
  start: string;

  @ApiProperty({ example: '23:00' })
  @IsString()
  end: string;
}

export class CreateOfferingDto {
  @ApiProperty({ description: '🈳 DB의 학교ID' })
  @IsInt()
  @IsOptional()
  schoolId?: number;

  @ApiProperty({ description: '🈳 DB의 학기ID' })
  @IsInt()
  termId: number;

  @ApiProperty({ description: '🈳 DB의 학기ID' })
  @IsInt()
  @IsOptional()
  lessonId?: number;

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

  @ApiProperty({ description: '수강신청 정원' })
  @IsInt()
  @IsOptional()
  capacity?: number;

  @ApiProperty({ description: '재수강우선 선확정 학생수' })
  @IsInt()
  @IsOptional()
  prepicked?: number;

  @ApiProperty({ description: '허용 학년 목록', type: [Number] })
  @IsArray()
  allowedGrades: number[];

  @ApiProperty({
    description: '수강신청 방식',
    enum: PickRule,
    default: PickRule.FIRST,
  })
  @IsEnum(PickRule)
  pickRule: PickRule;

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
  bitmasks: number[];

  @ApiProperty({ description: 'bitmasks (간단 배열)', type: [Number] })
  @IsArray()
  groupIds: number[];

  @ApiProperty({ description: '이전 수강자 ID 목록', type: [Number] })
  @IsArray()
  @ArrayMinSize(0)
  @IsInt({ each: true })
  @Min(1, { each: true })
  prepickedStudentIds: number[];

  @ApiProperty({ description: '마지막 동기화 시간', type: Number })
  @IsNumber()
  @IsOptional()
  lastSyncTimestamp?: number;

  @ApiProperty({
    description: '수강신청 방식',
    enum: ClassStatus,
    default: ClassStatus.PENDING,
  })
  @IsEnum(ClassStatus)
  status: ClassStatus;
}
