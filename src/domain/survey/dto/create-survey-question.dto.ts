import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { QuestionType } from 'src/common/enums/question-type';

export class CreateSurveyQuestionDto {
  @ApiProperty({ description: 'primary key', example: 1 })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ description: 'surveyId', example: 1 })
  @IsOptional()
  @IsInt()
  surveyId?: number;

  @ApiProperty({ description: '질문 내용', example: '수업에 만족하시나요?' })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({
    description: '질문 유형',
    enum: QuestionType,
    example: QuestionType.MULTIPLE_CHOICE,
  })
  @IsNotEmpty()
  @IsEnum(QuestionType)
  type: QuestionType;
}
