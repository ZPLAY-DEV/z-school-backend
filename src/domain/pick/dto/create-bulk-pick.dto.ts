import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsPositive } from 'class-validator';

// PickBaseDto: groupId, studentId, note (모두 필수)
export class CreateBulkPickDto {
  @ApiProperty({ description: '반 ID' })
  @IsInt()
  @IsPositive()
  groupId: number;

  @ApiProperty({ description: '학생 ID' })
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsArray()
  studentIds: number[];
}
