import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

/**
 * 학생 인덱스 조합 DTO
 * - studentId와 index를 함께 전달
 */
export class StudentIndexComboDto {
  @ApiProperty({
    description: '학생 ID - 인덱스를 업데이트할 학생의 고유 식별자',
    example: 123,
    minimum: 1,
  })
  @IsInt({ message: '학생 ID는 정수여야 합니다' })
  @IsPositive({ message: '학생 ID는 1 이상이어야 합니다' })
  studentId: number;

  @ApiProperty({
    description: '인덱스 - 학생의 위치 인덱스 (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: '인덱스는 정수여야 합니다' })
  @IsPositive({ message: '인덱스는 1 이상이어야 합니다' })
  index: number;
}
