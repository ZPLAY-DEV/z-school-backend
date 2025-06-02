import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsPositive } from 'class-validator';

// PickBaseDto: groupId, studentId, note (모두 필수)
export class CreateBulkPickDto {
  @ApiProperty({ description: '반 ID', example: 1 })
  @IsInt()
  @IsPositive()
  groupId: number;

  @ApiProperty({ description: '학생 ID', example: [1, 2, 3] })
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsArray()
  studentIds: number[];
}
