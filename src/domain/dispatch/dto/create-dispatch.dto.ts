import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
} from 'class-validator';
import { DispatchMode, DispatchType, TargetGroup } from 'src/common/enums';
import { TargetValidator } from '../validator/dispatch-target.validator';
import { IDispatchTarget } from 'src/common/interfaces';

export class CreateDispatchDto {
  @ApiProperty({
    description: '🈵 School ID',
    type: Number,
    example: '1 --- 학교의 id',
    required: true,
  })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  schoolId: number;

  @ApiProperty({
    description: '🈵 Term ID',
    type: Number,
    example: '1 --- 학기의 id',
    required: true,
  })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  termId: number;

  @ApiProperty({
    description: '🈵 게시글 제목',
    type: String,
    maxLength: 25,
    example: '1 --- 게시글 제목',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(25)
  title: string;

  @ApiProperty({
    description: '🈳 게시글 본문',
    type: String,
    example: '1 --- 게시글 본문',
    required: false,
  })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiProperty({
    description: '🈳 첨부 파일 URL',
    type: [String],
    example: ['1 --- 첨부 파일 URL'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: '🈵 발송 유형 ( ENROLLMENT, ANNOUNCEMENT, SURVEY )',
    enum: DispatchType,
    example:
      'ENROLLMENT --- 발송 유형 ( ENROLLMENT(수강신청), ANNOUNCEMENT(공지사항), SURVEY(설문지) )',
    required: true,
  })
  @IsNotEmpty()
  @IsEnum(DispatchType)
  type: DispatchType;

  @ApiProperty({
    description: '🈵발송 대상자의 상세 유형',
    example: `
    {
          "mainTarget": "학년별",
          "detail": ["1학년", "2학년", "3학년"]
    }`,
    required: true,
    type: Object,
  })
  @IsNotEmpty()
  @IsObject()
  @Validate(TargetValidator)
  target: IDispatchTarget;

  @ApiProperty({
    description: '🈵 발송 대상 유형 ( STUDENT, SAM )',
    enum: TargetGroup,
    example: 'STUDENT --- 발송 대상 유형 ( STUDENT(학생), SAM(강사) )',
    required: true,
  })
  @IsNotEmpty()
  @IsEnum(TargetGroup)
  targetGroup: TargetGroup;

  @ApiProperty({
    description: '🈵 발송 상태 ( IMMEDIATE, SCHEDULED, DRAFT )',
    enum: DispatchMode,
    example:
      'IMMEDIATE --- 발송 상태 ( IMMEDIATE(즉시 발송), SCHEDULED(예약 발송), DRAFT(발송X, 등록 ) )',
    required: true,
  })
  @IsNotEmpty()
  @IsEnum(DispatchMode)
  mode: DispatchMode;

  @ApiProperty({
    description: '🈳 예약 시간 ( 예약 발송 시 사용 )',
    type: Date,
    example: '2025-06-05T10:30:00+09:00',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  reservationDate?: Date;

  @ApiProperty({
    description:
      '🈵 발송 대상자 id - targetGroup에 따라 studentIds, samIds를 지정',
    type: [Number],
    example: [1, 2, 3],
    required: true,
  })
  @IsNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  targetIds: number[];
}
