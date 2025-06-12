import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { format } from 'date-fns';
import { AWS_SQS_CLIENT } from 'src/common/constants';
import { NotificationType } from 'src/common/enums/notification-type';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { classifyMessage } from 'src/helpers/classify';
import { AligoService } from 'src/services/aligo/aligo-service';
import { AligoListResult } from 'src/services/aligo/types';
import { SqsService } from 'src/services/aws/sqs.service';
import { NotificationService } from 'src/services/notification/notification.service';
import {
  FcmData,
  MessageBody,
  MixedPair,
} from 'src/services/notification/types';

@Injectable()
export class TextService {
  private readonly logger = new Logger(TextService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly aligoService: AligoService,
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
  ) {}

  async send(data: {
    messages: (MixedPair & MessageBody & FcmData)[];
    type: NotificationType;
    schoolId: number;
    role: string;
  }): Promise<any> {
    this.logger.log(`messages`, data.messages);
    return await this.notificationService.send(data);
  }

  async sendViaQueue(data: {
    messages: (MixedPair & MessageBody & FcmData)[];
    type: NotificationType;
    schoolId: number;
    role: string;
  }): Promise<any> {
    this.logger.log(`messages`, data.messages);
    const payload = {
      type: 'SEND_NOTIFICATIONS',
      data: data,
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
