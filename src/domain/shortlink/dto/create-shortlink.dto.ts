import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateShortlinkDto {
  @ApiProperty({ description: '🈳 parentId', example: 1 })
  @IsInt()
  parentId: number;

  @ApiProperty({ description: '🈳 newsletterId', example: 1 })
  @IsInt()
  newsletterId: number;

  @ApiProperty({
    description: '🈵 21자리 나노아이디 값',
    example: '1234567890',
    type: String,
  })
  @IsString()
  nanoid: string;

  @ApiProperty({
    description: '🈵 routing 정보',
    example: 'newsletters',
    type: String,
  })
  @IsString()
  page: string;

  @ApiProperty({
    description: '🈵 부가 정보',
    example: 'id=1&studentId=1&parentId=1',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  args?: string;

  @ApiProperty({
    description: '🈳 내용',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;
}
