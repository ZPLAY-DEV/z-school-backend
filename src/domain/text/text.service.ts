import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { format } from 'date-fns';
import { AWS_SQS_CLIENT } from 'src/common/constants';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { BulkMessage } from 'src/domain/text/dto/send-bulk-text.dto';
import { MessageResponseItem } from 'src/domain/text/types/text.types';
import { parseMessageType } from 'src/domain/text/utils/text.utils';

import { AligoService } from 'src/services/aligo/aligo-service';
import { SqsService } from 'src/services/aws/sqs.service';

@Injectable()
export class TextService {
  private readonly logger = new Logger(TextService.name);

  constructor(
    private readonly aligoService: AligoService,
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
  ) {}

  async send(
    sender: string,
    receiver: string,
    message: string,
    dryrun: boolean = false,
  ): Promise<any> {
    const dto = {
      sender,
      receiver,
      msg: message,
      msg_type: 'SMS',
      testmode_yn: dryrun ? 'Y' : 'N',
    };
    console.log(`dto`, dto);
    return await this.aligoService.send(dto);
  }

  async sendBulk(
    sender: string,
    messages: BulkMessage[],
    dryrun: boolean = false,
  ): Promise<any> {
    const baseDto = {
      sender,
      msg_type: 'SMS',
      testmode_yn: dryrun ? 'Y' : 'N',
      cnt: messages.length,
    };

    return await this.aligoService.sendBulkMessages(baseDto, messages);
  }

  async sendTextViaQueue(
    sender: string,
    receiver: string,
    message: string,
    dryrun: boolean = false,
  ): Promise<any> {
    const dto = {
      sender,
      receiver,
      msg: message,
      msg_type: 'SMS',
      testmode_yn: dryrun ? 'Y' : 'N',
    };
    console.log(`dto`, dto);
    const payload = {
      type: 'SEND_TEXT',
      data: dto,
    };
    try {
      return await this.sqsClient.sendMessage(payload);
    } catch (e) {
      console.log(e);
      throw new BadRequestException(HttpErrorConstants.SQS_ERROR);
    }
  }

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
    const items: MessageResponseItem[] = [];
    while (true) {
      const {
        list,
        next_yn,
      }: { list: MessageResponseItem[]; next_yn: string } =
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
        msg: parseMessageType(msg),
      });
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
