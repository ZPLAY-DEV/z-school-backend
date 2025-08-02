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
    weekday: {
      type: String,
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
      type: Date,
      required: false,
    },
    schoolNote: {
      type: String,
      required: false,
    },
    schoolNotedAt: {
      type: Date,
      required: false,
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
