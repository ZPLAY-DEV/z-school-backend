import { NewsletterType } from 'src/common/enums';
import { IEvent } from 'src/domain/event/entities/event.interface';

/**
 * Generate group key for DynamoDB
 */
export function generateEventKey(
  schoolId: number,
  type: NewsletterType,
): string {
  return `SCHOOL#${schoolId}#${type}`;
}

/**
 * Builds DynamoDB item by filtering out undefined values (NoSQL best practice)
 */
export function buildEventItem(item: IEvent): IEvent {
  const result: Partial<IEvent> = {};
  for (const [key, value] of Object.entries(
    item as unknown as Record<string, unknown>,
  )) {
    if (value !== undefined) {
      result[key as keyof IEvent] = value;
    }
  }
  return result as IEvent;
}
