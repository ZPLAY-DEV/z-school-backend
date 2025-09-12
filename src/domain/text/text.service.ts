import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { NewsletterType } from 'src/common/enums';
import { Student } from 'src/domain/student/entities/student.entity';
import { classifyMessage } from 'src/helpers/classify';
import { getTemplateOfNewsChanges } from 'src/helpers/get-message-body';
import { AligoService } from 'src/services/aligo/aligo.service';
import { AligoListResult } from 'src/services/aligo/types';
import { NotificationService } from 'src/services/notification/notification.service';
import { NotificationSendResult } from 'src/services/notification/types';
import { Repository } from 'typeorm';
@Injectable()
export class TextService {
  private readonly logger = new Logger(TextService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly aligoService: AligoService,
    private readonly notificationService: NotificationService,
  ) {}

  // ------------------------------------------------------------------------ //
  // Notification API
  // ------------------------------------------------------------------------ //

  async send(studentId): Promise<NotificationSendResult> {
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
      relations: ['parent', 'parent.user'],
    });
    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    const body = getTemplateOfNewsChanges({
      school: 'x학교',
      term: 'y학기',
      title: '제목입니다.',
      shortlink: 'https://스쿨허브.kr/2CC_-134dNVzNLECtykb6',
    });
    const data = {
      type: NewsletterType.CHANGES,
      schoolId: 1,
      messages: [
        {
          token: student.parent.user?.pushToken ?? null,
          phone: student.parent.phone,
          template: 'Text1',
          body: body,
          role: 'PARENT',
        },
      ],
    };

    return await this.notificationService.send(data);
  }

  // ------------------------------------------------------------------------ //
  // Aligo API
  // ------------------------------------------------------------------------ //

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
