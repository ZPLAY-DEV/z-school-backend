import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Category as CategoryEnum } from 'src/common/enums';

export class CreateCategoryDto {
  @ApiPropertyOptional({
    description: '분류',
    enum: CategoryEnum,
    default: CategoryEnum.FREE_CUSTOM,
  })
  @IsEnum(CategoryEnum)
  @IsOptional()
  type?: CategoryEnum;

  @ApiProperty({ description: 'name', maxLength: 32 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name: string;

  @ApiPropertyOptional({
    description: 'total count',
    type: Number,
    default: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  count?: number;

  @ApiPropertyOptional({
    description: 'Lesson IDs to associate with this category',
    type: [Number],
    isArray: true,
  })
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  lessonIds?: number[];
}
