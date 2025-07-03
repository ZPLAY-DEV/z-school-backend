import { Schema } from 'dynamoose';
import { AttendanceStatus } from 'src/common/enums';

export const AttendanceSchema = new Schema(
  {
    groupKey: {
      type: String,
      hashKey: true,
      required: true,
    },
    dailyStudentKey: {
      type: String,
      rangeKey: true,
      required: true,
    },
    lessonId: {
      type: Number,
      required: true,
    },
    lessonName: {
      type: String,
      required: true,
    },
    groupId: {
      type: Number,
      required: true,
    },
    groupName: {
      type: String,
      required: true,
    },
    studentId: {
      type: Number,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    start: {
      type: String,
      required: true,
    },
    end: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      required: true,
    },
    parentNote: {
      type: String,
      required: false,
    },
    parentNotedAt: {
      type: {
        value: Number,
        settings: {
          storage: 'milliseconds',
        },
      },
      required: false,
    },
    schoolNote: {
      type: String,
      required: false,
    },
    schoolNotedAt: {
      type: {
        value: Number,
        settings: {
          storage: 'milliseconds',
        },
      },
      required: false,
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

// console.log('hashKey:', AttendanceSchema.hashKey);
