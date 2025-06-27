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
