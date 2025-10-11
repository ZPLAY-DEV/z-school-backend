import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { NotifiableTarget } from 'src/common/enums';
import { CreateSurveyQuestionDto } from './create-survey-question.dto';

/**
 * Survey 발송 정보 (optional)
 */
export class SendSurveyDto {
  @ApiProperty({
    description: '🈵 발송 대상 유형',
    enum: NotifiableTarget,
    example: NotifiableTarget.GROUP,
  })
  @IsEnum(NotifiableTarget)
  target: NotifiableTarget;

  @ApiProperty({
    description: '🈳 대상별 아이템 ID 리스트 (GROUP의 경우 groupId 배열)',
    example: [1],
    required: false,
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  targetItems?: number[];

  @ApiProperty({
    description: '🈳 발송 대상 레이블',
    example: '3학년 1반',
    required: false,
  })
  @IsString()
  @IsOptional()
  targetLabel?: string;

  @ApiProperty({
    description: '🈳 발송예약 시각 (없으면 draft 상태)',
    example: '2025-06-26T00:30:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;
}

export class CreateSurveyDto {
  @ApiProperty({ description: '학교 ID', example: 1 })
  @IsNotEmpty()
  @IsInt()
  schoolId: number;

  @ApiProperty({ description: '학기 ID', example: 1 })
  @IsNotEmpty()
  @IsInt()
  termId: number;

  @ApiProperty({ description: '설문조사 제목', example: '만족도 조사' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: '설문조사 소개',
    example: '본 설문조사는...',
    required: false,
  })
  @IsOptional()
  @IsString()
  intro?: string;

  @ApiProperty({
    description: '설문조사 마무리',
    example: '설문조사에 참여해주셔서 감사합니다.',
    required: false,
  })
  @IsOptional()
  @IsString()
  outro?: string;

  @ApiProperty({
    description: '설문조사 시작일 (ISO 형식의 날짜 문자열)',
    example: '2025-01-01',
  })
  @IsNotEmpty()
  @IsDateString()
  start: string;

  @ApiProperty({
    description: '설문조사 종료일 (ISO 형식의 날짜 문자열)',
    example: '2025-02-01',
  })
  @IsNotEmpty()
  @IsDateString()
  end: string;

  @ApiProperty({
    description: '설문조사 질문 목록',
    type: [CreateSurveyQuestionDto],
    example: [
      {
        question: '수업에 만족하시나요?',
        type: 'MULTIPLE_CHOICE',
      },
      {
        question: '개선사항이 있다면 알려주세요.',
        type: 'SHORT_ANSWER',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyQuestionDto)
  surveyQuestions: CreateSurveyQuestionDto[];

  @ApiProperty({
    description: '🈳 발송 정보 (발송하려면 필수)',
    type: SendSurveyDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SendSurveyDto)
  send?: SendSurveyDto;
}
