import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Term } from 'src/domain/term/entities/term.entity';

//? ---------------------------------------------------------------------- ?//
//? Get School Term List
//? ---------------------------------------------------------------------- ?//

export const ListSchoolTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '📚 학교별 학기 목록 조회',
      description: `
**📝 기능 설명**
특정 학교에 등록된 모든 학기 목록을 조회합니다.

**🔄 비즈니스 로직**
- 해당 학교 ID에 속한 모든 학기 정보를 시간순으로 조회
- 학기 상태(진행 중, 완료, 예정)와 관계없이 전체 학기 목록 반환
- 학기별 수강신청 기간, 수업 기간, 상태 정보 포함
- 최신 학기부터 내림차순으로 정렬하여 제공

**⚠️ 중요 제약사항**
- 유효한 학교 ID가 필요함 (존재하는 학교)
- 조회 전용 API로 데이터 수정 불가
- 삭제된 학기는 목록에서 제외됨
- 학교 관리자 및 해당 학교 사용자만 접근 가능

**📚 예시 시나리오**
1. **관리자 대시보드**: 학교별 전체 학기 현황을 한눈에 파악
2. **학기 선택 화면**: 사용자가 특정 학기를 선택할 때 사용 가능한 학기 목록 제공
3. **통계 및 리포트**: 학기별 운영 데이터 분석을 위한 기본 정보 수집
4. **학기 관리**: 새 학기 생성 전 기존 학기 목록 확인

**API 호출 예시**
\`\`\`
GET /v1/schools/123/terms
\`\`\`

**성공 응답 예시**
\`\`\`json
[
  {
    "id": 456,
    "termName": "2024학년도 1학기",
    "startDate": "2024-03-01",
    "endDate": "2024-07-15",
    "pickStartDate": "2024-02-15",
    "pickEndDate": "2024-02-28",
    "status": "ACTIVE",
    "totalLessons": 25,
    "totalStudents": 150,
    "createdAt": "2024-01-15T09:00:00Z"
  },
  {
    "id": 455,
    "termName": "2023학년도 2학기",
    "startDate": "2023-09-01",
    "endDate": "2024-02-28",
    "pickStartDate": "2023-08-15",
    "pickEndDate": "2023-08-31",
    "status": "COMPLETED",
    "totalLessons": 30,
    "totalStudents": 140,
    "createdAt": "2023-07-15T09:00:00Z"
  },
  {
    "id": 457,
    "termName": "2024학년도 2학기",
    "startDate": "2024-09-01",
    "endDate": "2025-02-28",
    "pickStartDate": "2024-08-15",
    "pickEndDate": "2024-08-31",
    "status": "SCHEDULED",
    "totalLessons": 0,
    "totalStudents": 0,
    "createdAt": "2024-01-20T09:00:00Z"
  }
]
\`\`\`

**실패 응답 예시 - 존재하지 않는 학교**
\`\`\`json
{
  "statusCode": 404,
  "message": "해당 ID의 학교를 찾을 수 없습니다",
  "error": "Not Found"
}
\`\`\`

**실패 응답 예시 - 서버 오류**
\`\`\`json
{
  "statusCode": 500,
  "message": "학기 목록 조회 중 오류가 발생했습니다",
  "error": "Internal Server Error"
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '학교별 학기 목록 조회 완료',
      type: Term,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.INTERNAL_SERVER_ERROR),
  );
};
