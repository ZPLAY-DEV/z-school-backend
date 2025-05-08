import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { Student } from '../entities/student.entity';
import { CreateStudentDto } from '../dto/create-student.dto';

//? ---------------------------------------------------------------------- ?//
//? Private) 학생 생성
//? ---------------------------------------------------------------------- ?//
export const CreateStudentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학생 생성',
      description: `
      - 학교에 속한 학생을 생성한다.
      - 동일한 학교에 같은 학년, 반, 번호를 가진 학생이 중첩으로 존재할 수 없기 때문에, 동일한 schoolId, grade, class, studentCode 를 가진 학생이 존재하는 경우 해당 학생의 정보를 업데이트 한다.
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiBody({
      type: CreateStudentDto,
    }),
    ApiOkResponseTemplate({
      description: '학생 생성 완료',
      type: Student,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학생 일괄 생성
//? ---------------------------------------------------------------------- ?//
export const CreateStudentBulkDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학생 일괄 생성',
      description: `
      - upsert 방식으로 동작하기 때문에, 안심하고 덮어쓰면 됨.
      - 여러개 학생 생성 또는 업데이트 (CSV 로 전달시 사용)
      - 학교 아이디, 학년, 반, 번호 조합은 반드시 유니크 하기 때문에, 이미 등록되어 있는 학생의 정보를 입력할 경우, upsert 됨.
      `,
    }),
    ApiBody({
      type: CreateStudentDto,
      isArray: true,
    }),
    ApiOkResponseTemplate({
      description: '여러 학생 일괄 등록 완료',
      // type: CreateLessonResponseDto,
      // isArray: true,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_SCHOOL],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학생 일괄 조회
//? ---------------------------------------------------------------------- ?//
export const StudentListDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학생 일괄 조회',
      description: `
      - 학생 일괄 조회
      - 페이징 X
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiOkResponseTemplate({
      description: '학생 일괄 조회 완료',
      type: Student,
      isArray: true,
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학생 상세 조회
//? ---------------------------------------------------------------------- ?//
export const StudentDetailDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학생 상세 조회',
      description: `
      - 학생 상세 조회
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiParam({
      name: 'studentId',
      type: Number,
      description: '학생 ID',
    }),
    ApiOkResponseTemplate({
      description: '학생 상세 조회 완료',
      type: Student,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_STUDENT],
      },
    ]),
  );
};
