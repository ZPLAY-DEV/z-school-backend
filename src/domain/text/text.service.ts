import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';

import { AligoService } from 'src/services/aligo/aligo-service';

@Injectable()
export class TextService {
  private readonly logger = new Logger(TextService.name);

  constructor(private readonly aligoService: AligoService) {}

  async list(
    page: number,
    limit: number = 500,
    start: string | undefined,
    days: number = 1,
  ): Promise<any> {
    const startDate = start || format(new Date(), 'yyyyMMdd');
    const dto = {
      page,
      page_size: limit,
      start_date: startDate,
      limit_day: days,
    };
    console.log(`dto`, dto);
    return await this.aligoService.list(dto);
  }
}
