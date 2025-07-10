import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Student } from 'src/domain/student/entities/student.entity';

//? ---------------------------------------------------------------------- ?//
//? Get School Term Students List
//? ---------------------------------------------------------------------- ?//

export const SchoolTermStudentListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '👥 학기별 등록 학생 목록 조회',
      description: `
**📝 기능 설명**
특정 학교의 특정 학기에 등록된 모든 학생 목록을 조회합니다.

**🔄 비즈니스 로직**
- 해당 학기에 수강신청을 통해 등록된 학생들의 목록을 조회
- 학생 기본 정보(이름, 학년, 반, 연락처 등) 제공
- 수강신청 상태와 관계없이 해당 학기에 등록된 모든 학생 포함
- 학생명 기준으로 정렬하여 제공

**⚠️ 중요 제약사항**
- 유효한 학교 ID와 학기 ID가 필요함
- 해당 학교에 속한 학기만 조회 가능
- 삭제된 학생은 목록에서 제외
- 조회 전용 API

**📚 예시 시나리오**
1. **출석 관리**: 해당 학기 출석부 작성을 위한 학생 목록 조회
2. **학기별 학생 현황**: 관리자가 특정 학기의 등록 학생 현황 파악
3. **연락망 구성**: 학기별 학생 및 학부모 연락처 정보 수집
4. **성적 관리**: 해당 학기 성적 입력을 위한 학생 목록 확인

**API 호출 예시**
\`\`\`
GET /v1/schools/123/terms/456/students
\`\`\`

**성공 응답 예시**
\`\`\`json
[
  {
    "id": 1001,
    "studentName": "김학생",
    "grade": 3,
    "className": "3학년 1반",
    "phone": "01011111111",
    "parentName": "김학부모",
    "parentPhone": "01022222222",
    "status": "ACTIVE",
    "enrolledLessons": [
      {
        "lessonId": 789,
        "lessonName": "수학",
        "status": "ENROLLED"
      }
    ]
  },
  {
    "id": 1002,
    "studentName": "이학생",
    "grade": 2,
    "className": "2학년 3반",
    "phone": "01033333333",
    "parentName": "이학부모",
    "parentPhone": "01044444444",
    "status": "ACTIVE",
    "enrolledLessons": [
      {
        "lessonId": 790,
        "lessonName": "영어",
        "status": "ENROLLED"
      }
    ]
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

**실패 응답 예시 - 존재하지 않는 학기**
\`\`\`json
{
  "statusCode": 404,
  "message": "해당 ID의 학기를 찾을 수 없습니다",
  "error": "Not Found"
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      description: '학교 ID',
      example: 123,
    }),
    ApiParam({
      name: 'termId',
      description: '학기 ID',
      example: 456,
    }),
    ApiOkResponseTemplate({
      description: '학기별 등록 학생 목록 조회 완료',
      type: Student,
      isArray: true,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};
