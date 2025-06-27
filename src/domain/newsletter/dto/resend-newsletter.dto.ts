import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate } from 'class-validator';

export class ResendNewsletterDto {
  @ApiProperty({
    description:
      '🈵 재발송 시간 (예: "2025-06-24 10:00:00" 또는 "2025-06-24T10:00:00Z")',
    example: '2025-06-05T00:30:00Z',
    required: true,
  })
  @IsDate()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // "YYYY-MM-DD HH:mm:ss" 형식을 ISO 형식으로 변환
      const dateStr = value.replace(' ', 'T');
      if (!dateStr.includes('T')) {
        return new Date(value);
      }
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
        return new Date(dateStr + 'Z');
      }
      return new Date(dateStr);
    }
    return value as Date;
  })
  scheduledAt: Date;
}
