import { Schema } from 'dynamoose';
import {
  NotificationType,
  NotificationPlatform,
  NotificationStatus,
} from 'src/common/enums';

export const NotificationSchema = new Schema(
  {
    notificationKey: {
      type: String,
      hashKey: true,
      required: true,
    },

    targetKey: {
      type: String,
      rangeKey: true,
      required: true,
    },

    notificationId: {
      type: Number,
      required: true,
    },

    targetId: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },

    sentAt: {
      type: Number,
      required: false,
    },

    status: {
      type: String,
      enum: Object.values(NotificationStatus),
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
      enum: Object.values(NotificationPlatform),
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
