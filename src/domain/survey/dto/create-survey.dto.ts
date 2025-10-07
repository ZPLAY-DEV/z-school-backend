import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSurveyQuestionDto } from './create-survey-question.dto';

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
        type: 'MULTIPLE_CHOICE'
      },
      {
        question: '개선사항이 있다면 알려주세요.',
        type: 'SHORT_ANSWER'
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyQuestionDto)
  questions: CreateSurveyQuestionDto[];
}
