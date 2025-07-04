import { Schema } from 'dynamoose';

export const EventSchema = new Schema(
  {
    eventKey: {
      type: String, // (e.g., "SCHOOL#{schoolId}#{type}")
      hashKey: true,
      required: true,
    },
    eventTime: {
      type: Number, // unix timestamp
      rangeKey: true,
      required: true,
    },
    newsletterId: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'SENT', 'FAILED', 'CANCELED'],
      required: true,
    },
    payload: {
      type: Object,
      required: true,
    },
    expires: {
      type: {
        value: Number,
        settings: {
          storage: 'seconds', // TTL은 seconds로 유지
        },
      },
    },
  },
  {
    timestamps: true, // 자동으로 createdAt, updatedAt이 Date 타입으로 생성
  },
);
