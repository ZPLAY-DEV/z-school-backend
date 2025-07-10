import { applyDecorators } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';

//? ---------------------------------------------------------------------- ?//
//? Create School Calendar
//? ---------------------------------------------------------------------- ?//
export const CreateSchoolCalendarDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📅 학교 캘린더 생성 (NEIS API 연동)',
      description: `
**📝 기능 설명**
지정된 학교의 캘린더 정보를 NEIS API를 통해 가져와서 생성합니다.

**🔄 비즈니스 로직**
- NEIS(나이스) 교육행정정보시스템에서 학사일정 데이터를 실시간 조회
- 현재 날짜부터 9개월 후까지의 학사일정을 자동으로 가져옴
- 중복된 날짜의 경우 기존 데이터를 최신 정보로 업데이트 (Upsert 방식)
- 휴일, 행사일, 개교기념일 등 모든 학사일정을 자동 동기화
- 학교별 고유한 학사일정을 정확하게 반영

**⚠️ 중요 제약사항**
- 유효한 학교 ID가 필요함 (NEIS 시스템에 등록된 학교)
- NEIS API 서버 상태에 따라 응답 시간이 달라질 수 있음
- 일일 API 호출 횟수 제한이 있을 수 있음
- 인터넷 연결이 필요하며 외부 API 의존성 존재

**📚 예시 시나리오**
1. **신규 학교 등록**: 새로운 학교가 시스템에 등록된 후 학사일정 초기 설정
2. **학기 시작 전 갱신**: 새 학기 시작 전 최신 학사일정으로 업데이트
3. **정기 동기화**: 월 단위로 교육청 학사일정 변경사항 반영
4. **긴급 일정 변경**: 코로나19 등 특수 상황으로 인한 학사일정 긴급 변경 반영

**API 호출 예시**
\`\`\`
POST /v1/schools/123/calendar
\`\`\`

**성공 응답 예시**
\`\`\`json
{
  "createdCount": 42,
  "message": "42개의 학사일정이 성공적으로 생성/업데이트되었습니다",
  "syncPeriod": {
    "startDate": "2024-01-15",
    "endDate": "2024-10-15"
  },
  "lastSyncDate": "2024-01-15T09:30:00Z"
}
\`\`\`

**실패 응답 예시 - 존재하지 않는 학교**
\`\`\`json
{
  "statusCode": 404,
  "message": "해당 ID의 학교를 찾을 수 없습니다",
  "error": "Not Found"
}
\`\`\`

**실패 응답 예시 - NEIS API 오류**
\`\`\`json
{
  "statusCode": 500,
  "message": "NEIS API 연동 중 오류가 발생했습니다",
  "error": "Internal Server Error"
}
\`\`\`

**실패 응답 예시 - 잘못된 학교 정보**
\`\`\`json
{
  "statusCode": 400,
  "message": "NEIS 시스템에서 해당 학교 정보를 찾을 수 없습니다",
  "error": "Bad Request"
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      description: '학교 ID',
      example: 123,
    }),
    ApiCreatedResponse({
      description: '학교 캘린더 생성 완료',
      schema: {
        type: 'object',
        properties: {
          createdCount: {
            type: 'number',
            description: '생성/업데이트된 캘린더 항목 수',
            example: 42,
          },
          message: {
            type: 'string',
            description: '생성 완료 메시지',
            example: '42개의 학사일정이 성공적으로 생성/업데이트되었습니다',
          },
          syncPeriod: {
            type: 'object',
            properties: {
              startDate: {
                type: 'string',
                format: 'date',
                description: '동기화 시작 날짜',
                example: '2024-01-15',
              },
              endDate: {
                type: 'string',
                format: 'date',
                description: '동기화 종료 날짜',
                example: '2024-10-15',
              },
            },
          },
          lastSyncDate: {
            type: 'string',
            format: 'date-time',
            description: '마지막 동기화 일시',
            example: '2024-01-15T09:30:00Z',
          },
        },
      },
    }),
    ApiStatuses(
      StatusCodes.NOT_FOUND,
      StatusCodes.BAD_REQUEST,
      StatusCodes.INTERNAL_SERVER_ERROR,
    ),
  );
};
