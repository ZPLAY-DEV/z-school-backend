import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt } from 'class-validator';

export class CreateManualBookingDto {
  @ApiProperty({ description: 'ID of term', example: 1 })
  @IsInt()
  termId: number;

  @ApiProperty({ description: 'ID of group', example: 1 })
  @IsInt()
  groupId: number;

  @ApiProperty({ description: 'IDs of student', example: [1, 2, 3] })
  @IsArray()
  @Type(() => Number)
  studentIds: number[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<CreateManualBookingDto>) {
    Object.assign(this, partial);
  }
}
