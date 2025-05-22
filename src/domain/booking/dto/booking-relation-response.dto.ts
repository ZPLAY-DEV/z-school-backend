import { ApiProperty } from '@nestjs/swagger';
import { OfferingResponseDto } from 'src/domain/offering/dto/offering-response.dto';

export class BookingRelationResponseDto {
  @ApiProperty({ description: 'ID', type: Number })
  id: number;

  @ApiProperty({ description: '과목 ID', type: Number })
  offeringId: number;

  @ApiProperty({ description: '학생 ID', type: Number })
  studentId: number;

  @ApiProperty({ description: '과목명', type: String })
  lessonName: string;

  @ApiProperty({ description: '대기 순서', type: Number })
  waitingPosition: number;

  @ApiProperty({ description: '메모', type: String })
  note: string;

  @ApiProperty({ description: '생성 시간', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정 시간', type: Date })
  updatedAt: Date;

  @ApiProperty({ description: '과목', type: OfferingResponseDto })
  offering: OfferingResponseDto;
}
