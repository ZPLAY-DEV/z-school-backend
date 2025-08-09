import { Injectable, Logger } from '@nestjs/common';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';

@Injectable()
//! By using beforeInsert and beforeUpdate, we can avoid unwanted ghost updates.
export class OfferingSubscriber implements EntitySubscriberInterface<Offering> {
  private readonly logger = new Logger(OfferingSubscriber.name);

  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo(): any {
    return Offering;
  }

  /**
   * Before inserting: calculate prepicked count directly
   */
  beforeInsert(event: InsertEvent<Offering>) {
    const offering = event.entity;
    if (offering?.prepickedStudentIds?.length > 0) {
      offering.prepicked = offering.prepickedStudentIds.length;
      this.logger.log(
        `Setting prepicked count to ${offering.prepicked} for new offering`,
      );
    }
  }

  /**
   * Before updating: check if prepickedStudentIds changed, then set new count
   */
  beforeUpdate(event: UpdateEvent<Offering>) {
    const offering = event.entity;
    const prev = event.databaseEntity;

    if (!offering || !prev) {
      return;
    }

    const prevIds = Array.isArray(prev.prepickedStudentIds)
      ? prev.prepickedStudentIds
      : [];
    const currIds = Array.isArray(offering.prepickedStudentIds)
      ? offering.prepickedStudentIds
      : [];

    // Compare sets ignoring order
    const isChanged =
      prevIds.length !== currIds.length ||
      prevIds
        .slice()
        .sort()
        .some((id, idx) => id !== currIds.slice().sort()[idx]);

    if (isChanged) {
      offering.prepicked = currIds.length;
      this.logger.log(
        `Updating prepicked count to ${offering.prepicked} for offering ${offering.id}`,
      );
    }
  }
}
