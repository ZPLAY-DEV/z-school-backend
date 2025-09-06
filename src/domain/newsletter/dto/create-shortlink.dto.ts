import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateShortlinkDto {
  @ApiProperty({ description: '🈳 parentId', example: 1 })
  @IsInt()
  parentId: number;

  @ApiProperty({ description: '🈳 newsletterId', example: 1 })
  @IsInt()
  newsletterId: number;

  @ApiProperty({
    description: '🈳 dispatchId',
    example: 1,
  })
  @IsInt()
  dispatchId: number;

  @ApiProperty({
    description: '🈵 21자리 나노아이디 값',
    example: '1234567890',
    type: String,
  })
  @IsString()
  nanoid: string;

  @ApiProperty({
    description: '🈵 routing 정보',
    example: 'PARENT',
    type: String,
  })
  @IsString()
  role: string;

  @ApiProperty({
    description: '🈵 url',
    example: '/parent/offerings/1?studentId=1&parentId=1',
    type: String,
  })
  @IsString()
  url: string;

  @ApiProperty({
    description: '🈵 부가 정보',
    example: 'JSON.strinify({})',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  routes?: string;

  @ApiProperty({
    description: '🈳 내용',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({
    description: '🈳 내용',
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}
