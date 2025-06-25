import { Schema } from 'dynamoose';
import { EventStatus } from 'src/common/enums';

export const EventSchema = new Schema(
  {
    eventKey: {
      type: String,
      hashKey: true,
      required: true,
    },
    timestamp: {
      type: String,
      rangeKey: true,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    newsletterId: {
      type: Number,
      required: true,
    },
    schoolId: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EventStatus),
      required: true,
      default: EventStatus.PENDING,
    },
    payload: {
      type: Object,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    expires: {
      type: {
        value: Number,
        settings: {
          storage: 'seconds', //! this must be 10 digit number
        },
      },
    },
  },
  {
    saveUnknown: true,
    timestamps: {
      createdAt: {
        createdAt: {
          type: {
            value: Number,
            settings: {
              storage: 'milliseconds',
            },
          },
        },
      },
      updatedAt: {
        updatedAt: {
          type: {
            value: Number,
            settings: {
              storage: 'milliseconds',
            },
          },
        },
      },
    },
  },
);

// console.log('hashKey:', EventSchema.hashKey);
