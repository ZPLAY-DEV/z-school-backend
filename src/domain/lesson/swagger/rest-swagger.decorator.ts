import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { CreateLessonResponseDto } from 'src/domain/lesson/dto/create-lesson-response.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { Lesson } from '../entities/lesson.entity';

//? ---------------------------------------------------------------------- ?//
//? Create School > Term > Lesson
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolTermLessonDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교의 특정 학기에 과목 생성',
      description: `
      - upsert 방식으로 동작하기 때문에, 안심하고 덮어쓰기 가능.
      - 1개 과목 생성 또는 업데이트
      - 학교 아이디, 학기 아이디, 과목명 조합은 반드시 유니크 해야함.
      `,
    }),
    ApiBody({
      type: CreateLessonDto,
    }),
    ApiCreatedResponseTemplate({
      description: '과목 등록 완료',
      type: CreateLessonResponseDto,
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
          HttpErrorConstants.NOT_FOUND_TERM,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create School > Term > Lesson Bulk
//? ---------------------------------------------------------------------- ?//

export const CreateSchoolTermLessonBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교의 특정 학기에 과목 일괄 bulk 로 생성',
      description: `
      - upsert 방식으로 동작하기 때문에, 안심하고 덮어쓰면 됨.
      - 여러개 과목 생성 또는 업데이트 (CSV 로 전달시 사용)
      - 학교 아이디, 학기 아이디, 과목명 조합은 반드시 유니크 해야함.
      `,
    }),
    ApiBody({
      type: CreateLessonDto,
      isArray: true,
    }),
    ApiOkResponseTemplate({
      description: '여러 과목 일괄 등록 완료',
      type: CreateLessonResponseDto,
      isArray: true,
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
          HttpErrorConstants.NOT_FOUND_TERM,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update School > Term > Lesson
//? ---------------------------------------------------------------------- ?//

export const UpdateSchoolTermLessonDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교의 특정 학기의 과목 업데이트',
      description: `
      - 학교의 특정 학기에 속한 과목을 업데이트
      - Request 의 UpdateLessonDto 는 PartialType(CreateLessonDto) 로 변경 원하는 필드만 작성
        {
          "lessonName": "과목명",
          "schoolId": 1,
          "termId": 1,
          "lessonType": "과목",
          "lessonCategory": "과목",
          "lessonGroup": "과목"
        }
      `,
    }),
    ApiBody({
      type: UpdateLessonDto,
    }),
    ApiOkResponseTemplate({
      description: '과목 업데이트 완료',
      type: Lesson,
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
          HttpErrorConstants.NOT_FOUND_TERM,
          HttpErrorConstants.NOT_FOUND_LESSON,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? List School > Term > Lesson
//? ---------------------------------------------------------------------- ?//

export const SchoolTermLessonListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교의 특정 학기의 과목 리스트 조회 (전체)',
      description: `
      - 학교의 특정 학기에 속한 모든 과목 리스트를 조회합니다
      `,
    }),
    ApiOkResponseTemplate({
      description: '과목 리스트 조회 완료',
      type: Lesson,
      isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [
          HttpErrorConstants.NOT_FOUND_SCHOOL,
          HttpErrorConstants.NOT_FOUND_TERM,
        ],
      },
    ]),
  );
};
