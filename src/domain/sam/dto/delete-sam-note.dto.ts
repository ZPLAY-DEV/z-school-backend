import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class DeleteSamNoteDto {
  @ApiProperty({
    description: '삭제 사유',
    example: '강사 계약 종료',
    required: false,
    type: String,
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  note: string;
}
