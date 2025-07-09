import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Actor } from 'src/common/enums';

/**
 * 반(Group) 삭제 DTO
 * - 반 삭제 시 사유를 반드시 기록해야 함
 * - 삭제하는 사용자의 역할(role)은 자동으로 설정됨
 */
export class DeleteGroupDto {
  @ApiProperty({
    description:
      '삭제 사유 - 반 삭제/폐강 이유를 상세히 기재 (필수, 최대 500자)',
    type: String,
    example: '수강생 부족으로 인한 폐강',
    maxLength: 500,
  })
  @IsNotEmpty({ message: '삭제 사유는 필수입니다' })
  @IsString({ message: '삭제 사유는 문자열이어야 합니다' })
  @MaxLength(500, { message: '삭제 사유는 500자 이하여야 합니다' })
  note: string;

  @ApiPropertyOptional({
    description: '작업자 역할 - 삭제를 수행하는 사용자의 역할 (자동 설정됨)',
    enum: Actor,
    example: Actor.MANAGER,
  })
  @IsOptional()
  @IsEnum(Actor, { message: '올바른 역할을 선택해주세요' })
  role?: Actor;
}
