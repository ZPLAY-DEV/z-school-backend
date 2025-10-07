import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { QuestionType } from 'src/common/enums/question-type';

export class CreateSurveyQuestionDto {
  @ApiProperty({ description: '질문 내용', example: '수업에 만족하시나요?' })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({ 
    description: '질문 유형', 
    enum: QuestionType,
    example: QuestionType.MULTIPLE_CHOICE 
  })
  @IsNotEmpty()
  @IsEnum(QuestionType)
  type: QuestionType;
}
