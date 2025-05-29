import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';

//? ---------------------------------------------------------------------- ?//
//? Find Attendance by Date
//? ---------------------------------------------------------------------- ?//
export const FindAttendanceByDateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '반별 출석 👈 특정 날짜 조회',
      description: `
      - 특정 반의 특정 날짜에 대한 출석 정보를 조회합니다.
      - DynamoDB에서 데이터를 조회하여 실시간 출석 상태를 반환합니다.
      
      ### 매개변수:
      - \`groupId\`: 조회할 반의 ID (숫자)
      - \`date\`: 조회할 날짜 (YYYY-MM-DD 형식)
      
      ### 응답 데이터:
      - 해당 날짜의 모든 학생 출석 정보 배열
      - 각 출석 정보에는 학생 정보, 수업 정보, 출석 상태가 포함됩니다.
      
      ### 출석 상태:
      - \`PENDING\`: 대기 중
      - \`PRESENT\`: 출석
      - \`ABSENT\`: 결석
      - \`LATE\`: 지각
      - \`REPORTED_ABSENT\`: 사전 결석 신고
      - \`REPORTED_LATE\`: 사전 지각 신고
      `,
    }),
    ApiParam({
      name: 'groupId',
      type: 'string',
      description: '반 ID',
      example: '123',
    }),
    ApiParam({
      name: 'date',
      type: 'string',
      description: '조회할 날짜 (YYYY-MM-DD)',
      example: '2025-01-15',
    }),
    ApiOkResponseTemplate({
      description: '출석 정보 조회 성공',
      type: Object,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_ENTITY],
      },
    ]),
  );
};
