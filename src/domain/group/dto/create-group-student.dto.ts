import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Actor } from 'src/common/enums';

export class CreateGroupStudentDto {
  @ApiProperty({ description: '반 ID' })
  @IsInt()
  @IsPositive()
  groupId: number;

  @ApiProperty({ description: '학생 ID' })
  @IsInt()
  @IsPositive()
  studentId: number;

  @ApiProperty({ description: '학생 책값' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  bookFee?: number;

  @ApiProperty({ description: '학생 재료값' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  materialFee?: number;

  @ApiPropertyOptional({
    description: '누가 등록했나?',
    enum: Actor,
    default: Actor.SYSTEM,
  })
  @IsEnum(Actor)
  @IsOptional()
  enrolledBy?: Actor;

  @ApiPropertyOptional({
    description: '누가 삭제했나?',
    enum: Actor,
    default: Actor.SYSTEM,
  })
  @IsEnum(Actor)
  @IsOptional()
  deletedBy?: Actor;

  @ApiPropertyOptional({ description: '비고' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  note?: string;
}
