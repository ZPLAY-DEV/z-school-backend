import { Injectable, Logger } from '@nestjs/common';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';

@Injectable()
export class OfferingSubscriber implements EntitySubscriberInterface<Offering> {
  private readonly logger = new Logger(OfferingSubscriber.name);

  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo(): any {
    return Offering;
  }

  async afterInsert(event: InsertEvent<Offering>) {
    const offering = event.entity;

    try {
      // prepickedStudentIds 값이 있는 경우 prepicked 값을 설정
      if (
        offering.prepickedStudentIds &&
        offering.prepickedStudentIds.length > 0
      ) {
        offering.prepicked = offering.prepickedStudentIds.length;
        await event.manager.save(Offering, offering);

        this.logger.log(
          `Updated offering ${offering.id} prepicked count to ${offering.prepicked}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing offering creation: ${error.message}`,
        error.stack,
      );
    }
  }

  async afterUpdate(event: UpdateEvent<Offering>) {
    const offering = event.entity;
    const prev = event.databaseEntity;

    if (!offering) {
      return;
    }

    try {
      // prepickedStudentIds 변경 감지 및 prepicked 값 업데이트
      const prevPrepickedStudentIds = prev?.prepickedStudentIds || [];
      const currentPrepickedStudentIds = offering.prepickedStudentIds || [];

      // 배열 내용이 변경되었는지 확인
      const isPrepickedStudentIdsChanged =
        prevPrepickedStudentIds.length !== currentPrepickedStudentIds.length ||
        !prevPrepickedStudentIds.every(
          (id, index) => id === currentPrepickedStudentIds[index],
        );

      if (isPrepickedStudentIdsChanged) {
        offering.prepicked = currentPrepickedStudentIds.length;
        await event.manager.save(Offering, offering);

        this.logger.log(
          `Updated offering ${offering.id} prepicked count to ${offering.prepicked}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing offering update: ${error.message}`,
        error.stack,
      );
    }
  }
}
