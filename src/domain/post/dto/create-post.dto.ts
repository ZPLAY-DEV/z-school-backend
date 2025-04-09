import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PostCategory } from 'src/common/enums';

export class CreatePostDto {
  @ApiPropertyOptional({ description: '사용자 ID', type: Number })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number;

  @ApiProperty({ description: '종류', enum: PostCategory })
  @IsEnum(PostCategory)
  category: PostCategory;

  @ApiProperty({ description: '제목', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  title: string;

  @ApiPropertyOptional({ description: '본문' })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({ description: '이미지들', type: [String] })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: '비공개 여부', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isPrivate?: boolean = false;
}
