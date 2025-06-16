import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateDispatchReadDto {
  @ApiProperty({
    description: '🈳 Parent ID',
    type: Number,
    required: true,
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  parentId: number;

  @ApiProperty({
    description: '🈳 Dispatch ID',
    type: Number,
    required: true,
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  dispatchId: number;
}
