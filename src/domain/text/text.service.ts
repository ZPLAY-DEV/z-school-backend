import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { classifyMessage } from 'src/helpers/classify';
import { AligoService } from 'src/services/aligo/aligo.service';
import { AligoListResult } from 'src/services/aligo/types';

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
    const startDate =
      start?.replace(/[^0-9]/g, '') || format(new Date(), 'yyyyMMdd');
    const dto = {
      page,
      page_size: limit,
      start_date: startDate,
      limit_day: days,
    };
    console.log(`dto`, dto);
    return await this.aligoService.list(dto);
  }

  async aggregate(start: string | undefined): Promise<any> {
    const page = 1;
    const startDate =
      start?.replace(/[^0-9]/g, '') || format(new Date(), 'yyyyMMdd');
    const dto = {
      page,
      page_size: 500,
      start_date: startDate,
      limit_day: 1,
    };
    console.log(`dto`, dto);
    const items: AligoListResult[] = [];
    while (true) {
      const { list, next_yn }: { list: AligoListResult[]; next_yn: string } =
        await this.aligoService.list(dto);
      items.push(...list);
      if (next_yn === 'N') {
        break;
      }
      dto.page++;
    }
    const result: Record<string, any[]> = {};
    items.forEach((item) => {
      const { sender, mid, sms_count, msg } = item;
      if (!result[sender]) {
        result[sender] = [];
      }
      result[sender].push({
        id: mid,
        count: +sms_count,
        msg: classifyMessage(msg),
      });
    });

    return result;
  }

  async remain(): Promise<any> {
    return await this.aligoService.remain();
  }

  async detail(id: number, limit: number = 500): Promise<any> {
    const dto = {
      mid: id,
      page: 1,
      page_size: limit,
    };
    console.log(`dto`, dto);
    return await this.aligoService.detail(dto);
  }
}
