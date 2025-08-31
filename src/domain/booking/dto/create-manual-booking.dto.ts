import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateManualBookingDto {
  @ApiProperty({ description: 'ID of the group', example: 1 })
  @IsInt()
  groupId: number;

  @ApiProperty({ description: 'ID of the student', example: 1 })
  @IsInt()
  studentId: number;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<CreateManualBookingDto>) {
    Object.assign(this, partial);
  }
}
