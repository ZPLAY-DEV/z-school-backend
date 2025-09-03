import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt } from 'class-validator';

export class CreateManualBookingDto {
  @ApiProperty({ description: 'ID of the group', example: 1 })
  @IsInt()
  groupId: number;

  @ApiProperty({ description: 'IDs of the student', example: [1, 2, 3] })
  @IsArray()
  @Type(() => Number)
  studentIds: number[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<CreateManualBookingDto>) {
    Object.assign(this, partial);
  }
}
