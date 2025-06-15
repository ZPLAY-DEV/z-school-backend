import { Injectable } from '@nestjs/common';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { EventStatus } from 'src/common/enums';
import { IEvent, IEventKey } from 'src/domain/event/entities/event.interface';

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
      status: EventStatus.PENDING,
      dateKey: 'DATE#2025-01-01T10:00:00Z#ID#1',
      type: 'EVERY_5MINS',
      payload: { userId: 1, messages: ['Hello World'] },
      expires: ttl,
    });
  }
}
