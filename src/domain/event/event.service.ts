import { Injectable } from '@nestjs/common';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { EventStatus } from 'src/common/enums';
import { IEvent, IEventKey } from 'src/domain/event/entities/event.interface';
import { generateEventKey } from 'src/domain/event/utils/event.utils';

@Injectable()
export class EventService {
  constructor(
    @InjectModel('Event')
    private readonly model: Model<IEvent, IEventKey>,
  ) {}

  async init(): Promise<void> {
    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + 60 * 60 * 24; // 1 일
    await this.model.create({
      eventKey: 'SCHOOL#1#NEWSLETTER#1',
      timestamp: 'DATE#2025-01-01T10:00:00Z#ID#1',
      type: 'EVERY_5MINS',
      newsletterId: 1,
      schoolId: 1,
      status: EventStatus.PENDING,
      payload: { userId: 1, messages: ['Hello World'] },
      expires: ttl,
    });
  }

  async createEvent(eventData: IEvent): Promise<IEvent> {
    return await this.model.create(eventData);
  }

  // Newsletter별 이벤트 조회 (School과 Newsletter ID 조합으로 조회)
  async getEventsByNewsletter(
    schoolId: number,
    newsletterId: number,
  ): Promise<IEvent[]> {
    const partitionKey = `SCHOOL#${schoolId}#NEWSLETTER#${newsletterId}`;
    return await this.model.query('partitionKey').eq(partitionKey).exec();
  }

  // School별 모든 Newsletter 이벤트 조회 (스캔 필요)
  async getEventsBySchool(schoolId: number): Promise<IEvent[]> {
    return await this.model.scan('schoolId').eq(schoolId).exec();
  }

  // 특정 이벤트의 상태 업데이트
  async updateEventStatus(
    schoolId: number,
    newsletterId: number,
    timestamp: string,
    status: EventStatus,
  ): Promise<IEvent> {
    const eventKey = generateEventKey(schoolId, newsletterId);
    return await this.model.update(
      { eventKey, timestamp },
      { status },
      { return: 'item' },
    );
  }

  // 특정 이벤트 조회
  async getEvent(
    schoolId: number,
    newsletterId: number,
    timestamp: string,
  ): Promise<IEvent | null> {
    try {
      const eventKey = generateEventKey(schoolId, newsletterId);
      return await this.model.get({ eventKey, timestamp });
    } catch {
      return null;
    }
  }
}
