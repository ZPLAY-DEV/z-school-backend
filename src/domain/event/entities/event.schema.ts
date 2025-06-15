import { Schema } from 'dynamoose';
import { EventStatus } from 'src/common/enums';

export const EventSchema = new Schema(
  {
    status: {
      type: String,
      hashKey: true,
      enum: Object.values(EventStatus),
      required: true,
    },
    dateKey: {
      type: String,
      rangeKey: true,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    payload: {
      type: Object,
      required: true,
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
