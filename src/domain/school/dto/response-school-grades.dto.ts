import { ApiProperty } from '@nestjs/swagger';

export class ResponseSchoolGradesDto {
  @ApiProperty({ type: Number })
  grade: number;

  @ApiProperty({ type: [String] })
  klasses: string[];
}
