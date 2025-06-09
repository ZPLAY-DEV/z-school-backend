import { Schema } from 'dynamoose';
import {
  DispatchType,
  DispatchPlatform,
  DispatchStatus,
} from 'src/common/enums';

export const DispatchSchema = new Schema(
  {
    dispatchKey: {
      type: String,
      hashKey: true,
      required: true,
    },

    targetKey: {
      type: String,
      rangeKey: true,
      required: true,
    },

    dispatchId: {
      type: Number,
      required: true,
    },

    targetId: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(DispatchType),
      required: true,
    },

    sentAt: {
      type: Number,
      required: false,
    },

    status: {
      type: String,
      enum: Object.values(DispatchStatus),
      default: 'READY',
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    requestId: {
      type: String,
      required: false,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    platform: {
      type: String,
      enum: Object.values(DispatchPlatform),
      required: true,
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
