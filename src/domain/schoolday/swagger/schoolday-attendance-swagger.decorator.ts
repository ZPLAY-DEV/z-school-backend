import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { CreateAttendanceOfSchooldayWithRangeDto } from 'src/domain/schoolday/dto/create-attendance-of-schoolday.dto';

//? ---------------------------------------------------------------------- ?//
//? Create Attendance for Schooldays (Range)
//? ---------------------------------------------------------------------- ?//
export const CreateAttendanceOfSchooldayWithRangeDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '수업일별 출석 👈 기간별 생성',
      description: `
      - 지정된 기간 내의 모든 수업일에 대해 출석 데이터를 생성합니다.
      - MySQL에서 Schoolday 데이터를 조회하고, DynamoDB에 출석 기록을 일괄 생성합니다.
      
      ### 처리 과정:
      1. 지정된 기간 내의 모든 Schoolday 조회
      2. 각 Schoolday의 수강생 정보 조회
      3. DynamoDB에 출석 기록 일괄 생성 (BatchWrite)
      4. 기본 출석 상태: PENDING
      
      ### 매개변수:
      - \`schoolId\`: 학교 ID (선택사항)
      - \`termId\`: 학기 ID (선택사항)
      - \`from\`: 시작 날짜 (YYYY-MM-DD)
      - \`to\`: 종료 날짜 (YYYY-MM-DD)
      
      ### 응답:
      - 처리된 Schoolday 배열 반환
      - 각 Schoolday에는 반 정보와 학생 정보가 포함됩니다.
      
      ### 주의사항:
      - 대량 데이터 처리 시 시간이 오래 걸릴 수 있습니다.
      - DynamoDB 배치 작업 제한으로 인해 재시도 로직이 포함되어 있습니다.
      `,
    }),
    ApiBody({
      type: CreateAttendanceOfSchooldayWithRangeDto,
      examples: {
        example1: {
          summary: '일주일 기간 출석 생성',
          description: '2025년 1월 15일부터 21일까지의 출석 데이터 생성',
          value: {
            schoolId: 1,
            termId: 1,
            from: '2025-01-15',
            to: '2025-01-21',
          },
        },
        example2: {
          summary: '한 달 기간 출석 생성',
          description: '2025년 1월 전체의 출석 데이터 생성',
          value: {
            schoolId: 1,
            termId: 1,
            from: '2025-01-01',
            to: '2025-01-31',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: '출석 데이터 생성 완료',
      type: Array,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [
          HttpErrorConstants.NOT_FOUND_SCHOOL,
          HttpErrorConstants.NOT_FOUND_ENTITY,
        ],
      },
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        errorFormatList: [HttpErrorConstants.INTERNAL_SERVER_ERROR],
      },
    ]),
  );
};
