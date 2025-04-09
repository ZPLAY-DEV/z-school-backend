import { Schema } from 'dynamoose';
import { AlarmType } from 'src/common/enums';

export const AlarmSchema = new Schema(
  {
    userId: {
      type: Number,
      hashKey: true,
      required: true,
    },
    id: {
      type: String, // in the form of `msg_{unixtimestamp}`
      rangeKey: true,
      required: true,
    },
    alarmType: {
      type: String, // AlarmType,
      enum: [
        AlarmType.GENERAL,
        AlarmType.MEETUP,
        AlarmType.FEED,
        AlarmType.CHAT,
        AlarmType.ACTIVITY,
        AlarmType.SETTING,
      ],
    },
    message: {
      type: String,
    },
    data: {
      type: Object,
      schema: {
        page: String,
        args: {
          type: String,
          required: false,
        },
      },
    },
    link: {
      type: String,
      required: false,
    },
    user: {
      type: Object,
      schema: {
        username: String,
        avatar: String,
        gender: String,
        userId: Number,
        age: Number,
      },
      required: false,
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

// console.log('hashKey:', AlarmSchema.hashKey);
