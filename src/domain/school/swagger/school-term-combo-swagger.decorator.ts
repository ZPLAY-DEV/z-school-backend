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
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { ResponseSchoolTermComboDto } from '../dto/response-school-term-combo.dto';

//? ---------------------------------------------------------------------- ?//
//? Get School Term Combo
//? ---------------------------------------------------------------------- ?//

export const GetSchoolTermComboDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🔄 학교-학기 (강좌, 담임쌤, 학생) stats 조회',
      description: `
**📝 기능 설명**
특정 학교의 특정 학기에 대한 모든 관련 정보(강좌, 담임쌤, 학생)를 한 번에 조회합니다.

**🔄 비즈니스 로직**
- 해당 학기에 개설된 모든 강좌(Lessons) 정보 조회
- 수업과 연결된 계약을 통해 해당 학기의 담임쌤(Sams) 정보 중복 제거 후 조회
- 수강신청(Picks)을 통해 해당 학기에 등록된 학생(Students) 정보 중복 제거 후 조회
- 프론트엔드에서 여러 API 호출 없이 필요한 모든 데이터를 한 번에 제공

**⚠️ 중요 제약사항**
- 학교 ID와 학기 ID가 유효해야 함 (존재하는 학교와 학기)
- 해당 학교에 속한 학기만 조회 가능
- 조회 전용 API로 데이터 수정 불가
- 실시간 데이터 반영으로 수강신청 변경사항이 즉시 조회됨

**📚 예시 시나리오**
1. **관리자 대시보드**: 학기별 전체 현황을 한 번에 파악
2. **수강신청 시스템**: 수업-강사-학생 연계 정보를 통합적으로 표시
3. **출석 관리 시스템**: 해당 학기의 모든 관련 주체 정보를 한 번에 로드
4. **모바일 앱 초기화**: 앱 시작 시 필요한 모든 정보를 한 번의 호출로 수집

**API 호출 예시**
\`\`\`
GET /v1/schools/123/terms/456/combo
\`\`\`

**성공 응답 예시**
\`\`\`json
{
  "lessons": [
    {
      "id": 789,
      "lessonName": "영어회화 초급반",
      "category": "언어",
      "grade": "1,2,3",
      "maxStudents": 20,
      "currentStudents": 15,
      "weekday": "MONDAY",
      "startTime": "09:00",
      "endTime": "10:30",
      "location": "영어실",
      "fee": 50000,
      "status": "ACTIVE"
    }
  ],
  "sams": [
    {
      "id": 101,
      "name": "김영희",
      "phone": "01012345678",
      "email": "kim@example.com",
      "specialty": "영어교육",
      "career": "10년",
      "status": "ACTIVE"
    }
  ],
  "students": [
    {
      "id": 1001,
      "studentName": "홍길동",
      "grade": 3,
      "className": "3학년 1반",
      "phone": "01011111111",
      "parentName": "홍아버지",
      "parentPhone": "01022222222",
      "status": "ACTIVE"
    }
  ]
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

**실패 응답 예시 - 존재하지 않는 학기**
\`\`\`json
{
  "statusCode": 404,
  "message": "해당 ID의 학기를 찾을 수 없습니다",
  "error": "Not Found"
}
\`\`\`

**실패 응답 예시 - 잘못된 파라미터**
\`\`\`json
{
  "statusCode": 400,
  "message": "유효하지 않은 학교 또는 학기 ID입니다",
  "error": "Bad Request"
}
\`\`\`
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
      example: 123,
      required: true,
    }),
    ApiParam({
      name: 'termId',
      type: Number,
      description: '학기 ID',
      example: 456,
      required: true,
    }),
    ApiExtraModels(ResponseSchoolTermComboDto, Lesson, Sam, Student),
    ApiOkResponse({
      description: '학교-학기 통합 데이터 조회 성공',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseSchoolTermComboDto) },
          {
            properties: {
              lessons: {
                type: 'array',
                items: { $ref: getSchemaPath(Lesson) },
                description: '해당 학기에 개설된 모든 수업 목록',
              },
              sams: {
                type: 'array',
                items: { $ref: getSchemaPath(Sam) },
                description: '해당 학기에 참여하는 모든 강사 목록',
              },
              students: {
                type: 'array',
                items: { $ref: getSchemaPath(Student) },
                description: '해당 학기에 등록된 모든 학생 목록',
              },
            },
          },
        ],
      },
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND),
  );
};
