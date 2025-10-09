import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { Reminder } from 'src/domain/reminder/entities/reminder.entity';

//? ---------------------------------------------------------------------- ?//
//? Get Reminder
//? ---------------------------------------------------------------------- ?//

export const GetReminderDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🏫 학교 학기별 수강신청 안내 조회',
      description:
        '특정 학교와 학기의 수강신청 안내를 조회합니다. 학기당 1개만 존재합니다.',
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 1,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 1,
    }),
    ApiExtraModels(Reminder),
    ApiOkResponse({
      description: '수강신청 안내 조회 성공',
      schema: { $ref: getSchemaPath(Reminder) },
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
