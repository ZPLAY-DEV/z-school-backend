import { IEvent } from 'src/domain/event/entities/event.interface';

/**
 * Generate group key for DynamoDB
 */
export function generateEventKey(
  schoolId: number,
  newsletterId: number,
): string {
  return `SCHOOL#${schoolId}#NEWSLETTER#${newsletterId}`;
}

/**
 * Calculate TTL expiration timestamp
 */
export function calculateTtl(startsAt: Date): number {
  return (
    Math.floor(startsAt.getTime() / 1000) + 60 * 60 * 24 * 365 // 365일 TTL
  );
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
