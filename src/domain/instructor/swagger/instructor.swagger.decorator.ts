import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiCreatedResponseTemplate } from 'src/common/swagger/response/api-created.response';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { CreateInstructorDto } from '../dto/create-instructor.dto';
import { UpdateInstructorDto } from '../dto/update-instructor.dto';

//? ---------------------------------------------------------------------- ?//
//? Create School > Instructor
//? ---------------------------------------------------------------------- ?//
export const CreateInstructorDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교 > 강사 생성',
      description: `
      - 학교에 귀속된 강사를 생성한다.
      - 학교에 귀속된 강사의 정보와 강사의 정보가 이미 등록되어 있을 경우 Upsert 된다. ( 업데이트에서도 해당 엔드포인트로 처리 가능 )
      `,
    }),
    ApiParam({
      name: 'schoolId',
      type: Number,
      description: '학교 ID',
    }),
    ApiBody({
      type: CreateInstructorDto,
    }),
    ApiCreatedResponseTemplate({
      description: 'Term 생성 완료',
      type: Instructor,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Soft Delete Instructor
//? ---------------------------------------------------------------------- ?//
export const SoftDeleteSchoolInstructorDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 학교에 속한 강사 삭제',
      description: `
      - 학교에 속한 강사를 소프트 삭제한다. (soft delete)
      - note 필드에 삭제 사유를 입력할 수 있음. 
      - 삭제 후 해당 강사는 학교에서 조회되지 않음.
      - 해당 강사의 모든 정보는 삭제되지 않음.
      `,
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '학교에 속한 강사 ID ( instructorSchoolId )',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          note: { type: 'string', description: '삭제 사유 (선택사항)' },
        },
      },
    }),
    ApiOkResponseTemplate({
      description: '강사 소프트 삭제 완료',
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Instructor
//? ---------------------------------------------------------------------- ?//
export const CreateInstructorSimpleDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 강사 생성',
      description: '새로운 강사를 생성합니다.',
    }),
    ApiBody({ type: CreateInstructorDto }),
    ApiCreatedResponseTemplate({
      description: '강사 생성 완료',
      type: Instructor,
    }),
    ApiStatuses(StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Get Instructor by ID
//? ---------------------------------------------------------------------- ?//
export const FindInstructorByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 강사 조회',
      description: 'ID로 강사 정보를 조회합니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '강사 ID',
    }),
    ApiOkResponseTemplate({
      description: '강사 조회 완료',
      type: Instructor,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Update Instructor
//? ---------------------------------------------------------------------- ?//
export const UpdateInstructorDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '✅ 강사 수정',
      description: '강사 정보를 수정합니다.',
    }),
    ApiParam({
      name: 'id',
      type: Number,
      description: '강사 ID',
    }),
    ApiBody({ type: UpdateInstructorDto }),
    ApiOkResponseTemplate({
      description: '강사 수정 완료',
      type: Instructor,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
