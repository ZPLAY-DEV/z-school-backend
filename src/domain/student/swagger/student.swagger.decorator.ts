import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { CreateStudentDto } from '../dto/create-student.dto';

import { StudentResponseDto } from '../dto/student-response.dto';
import { UpdateStudentStatusDto } from '../dto/update-student-status.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { StudentRelationResponseDto } from '../dto/student-relation-response.dto';
import { BookingStatus } from 'src/common/enums';
import { BookingRelationResponseDto } from 'src/domain/booking/dto/booking-relation-response.dto';

//? ---------------------------------------------------------------------- ?//
//? Private) 학생 생성
//? ---------------------------------------------------------------------- ?//
export const CreateStudentDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학생 생성 ( upsert )',
      description: `
      - 학교에 속한 학생을 생성한다. 
      - dryRun 모드로 동작을 하기 때문에, 사용자가 승인을 누르면 upsert 플로우로 진행한다.
      `,
    }),
    ApiBody({
      type: CreateStudentDto,
    }),
    ApiCreatedResponse({
      description: '학생 생성 완료',
      type: StudentResponseDto,
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
//? Private) 학생 상세 조회
//? ---------------------------------------------------------------------- ?//
export const StudentFindByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학생 상세 조회',
      description: `
      - 학생의 상세 정보를 조회한다.
      - 학생 상세 정보에서 수강중인 강좌 수는 반환되는 groupStudents 객체의 length 값으로 처리해야한다.
      - 학생 상세 정보에서 학부모앱 사용 여부는 반환되는 parent 객체의 userId 값이 null 값으로 존재 여부를 판별해야한다.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학생 ID',
    }),
    ApiOkResponseTemplate({
      description: '학생 상세 조회 완료',
      type: StudentRelationResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_STUDENT],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) Student (dryrun)
//? ---------------------------------------------------------------------- ?//
export const StudentDryRunDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학생 dryRun 체크',
      description: `
      - 학생(단일) 생성 dryrun 체크 -> dryrun은 실제로 데이터를 등록할 때, 데이터를 덮어쓰는 여부를 판별하는 엔드포인트
      - 실제로 데이터를 생성하지 않고 어떤 데이터가 생성될지 미리 확인 ( 해당 엔드포인트로 Upsert 여부를 결정 )
      - 반환되는 값이 존재할 경우 schoolId - grade - class - studentCode 로 중복 여부를 판단
      - 반환되는 값이 존재 하지 않을 경우, 중첩되는 학생이 없음을 의미
      `,
    }),
    ApiBody({
      type: CreateStudentDto,
    }),
    ApiOkResponseTemplate({
      description: '학생 등록 시물레이션 결과',
      type: StudentResponseDto,
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
//? Private) 학생 재학 상태 업데이트
//? ---------------------------------------------------------------------- ?//
export const StudentStatusUpdateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학생 재학 상태 업데이트',
      description: `
      - 학생 재학 상태 업데이트
      - 학생의 재학 상태 (status)값을 요청 보내는 유형에 맞춰서 변경 (status -> ATTENDING(재학), TRANSFERRED(전학), GRADUATED(졸업))
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
    ApiBody({
      type: UpdateStudentStatusDto,
    }),
    ApiOkResponseTemplate({
      description: '학생 재학 상태 업데이트 완료',
      type: StudentResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [
          HttpErrorConstants.NOT_FOUND_STUDENT,
          HttpErrorConstants.NOT_FOUND_SCHOOL,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학생 정보 수정
//? ---------------------------------------------------------------------- ?//
export const StudentUpdateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '❌ 학생 정보 수정 - (미사용)',
      description: `
      - 학생 정보 수정
      - schoolId - grade - class - studentCode 는 UNIQUE 하기 때문에, 다른 학생의 정보와 중복되는 경우 Conflict 에러를 반환.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학생 ID',
    }),
    ApiBody({
      type: UpdateStudentDto,
    }),
    ApiOkResponseTemplate({
      description: '학생 정보 수정 완료',
      type: StudentRelationResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [
          HttpErrorConstants.NOT_FOUND_STUDENT,
          HttpErrorConstants.NOT_FOUND_SCHOOL,
        ],
      },
      {
        status: StatusCodes.CONFLICT,
        errorFormatList: [HttpErrorConstants.CONFLICT_STUDENT],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학생의 수강/취소 강좌 조회
//? ---------------------------------------------------------------------- ?//
export const StudentGroupFindByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학생의 수강/취소 강좌 조회',
      description: `
      - 학생의 수강/취소 강좌 조회
      - 수강은 ENROLLED, 취소는 CANCELED 로 조회 QueryString에 포함시켜서 요청
      - ENROLLED, CANCELED 이외의 값이 들어오면 400 에러 반환
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학생 ID',
      required: true,
    }),

    ApiQuery({
      name: 'status',
      enum: BookingStatus,
      description: '수강/취소 강좌 상태',
      required: true,
    }),
    ApiOkResponseTemplate({
      description: '학생의 수강/취소 강좌 조회 완료',
      // type: PickResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.STUDENT_COURSE_STATUS_NOT_FOUND],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학생의 수강신청 정보 조회
//? ---------------------------------------------------------------------- ?//
export const StudentBookingFindByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학생의 수강신청 정보 조회',
      description: `
      - 학생이 수강신청한 내역을 조회
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학생 ID',
      required: true,
    }),
    ApiOkResponseTemplate({
      description: '학생의 수강신청 정보 조회 완료',
      type: BookingRelationResponseDto,
    }),
  );
};
