import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { SmsItem } from 'src/domain/text/types/text.types';

import { AligoService } from 'src/services/aligo/aligo-service';

@Injectable()
export class TextService {
  private readonly logger = new Logger(TextService.name);

  constructor(private readonly aligoService: AligoService) {}

  async send(
    sender: string,
    receiver: string,
    message: string,
    dryrun: boolean = false,
  ): Promise<any> {
    const dto = dryrun
      ? {
          sender,
          receiver,
          msg: message,
          msg_type: 'SMS',
          testmode_yn: 'Y',
        }
      : {
          sender,
          receiver,
          msg: message,
          msg_type: 'SMS',
        };
    return await this.aligoService.send(dto);
  }

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

  async aggregate(start: string | undefined): Promise<any> {
    const page = 1;
    const startDate = start || format(new Date(), 'yyyyMMdd');
    const dto = {
      page,
      page_size: 500,
      start_date: startDate,
      limit_day: 1,
    };
    console.log(`dto`, dto);
    const items: SmsItem[] = [];
    while (true) {
      const { list, next_yn }: { list: SmsItem[]; next_yn: string } =
        await this.aligoService.list(dto);
      items.push(...list);
      if (next_yn === 'N') {
        break;
      }
      dto.page++;
    }
    const result: Record<string, string[]> = {};
    items.forEach((item) => {
      const { sender, mid } = item;
      if (!result[sender]) {
        result[sender] = [];
      }
      result[sender].push(mid);
    });

    return result;
  }

  async remain(): Promise<any> {
    return await this.aligoService.remain();
  }

  async detail(id: string, limit: number = 500): Promise<any> {
    const dto = {
      mid: id,
      page: 1,
      page_size: limit,
    };
    console.log(`dto`, dto);
    return await this.aligoService.detail(dto);
  }
}
