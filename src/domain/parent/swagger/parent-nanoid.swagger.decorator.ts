import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { CreateNanoIdDto } from 'src/domain/parent/dto/create-nanoid.dto';
import { NanoId } from 'src/domain/parent/entities/nanoid.entity';

//? ---------------------------------------------------------------------- ?//
//? Create NanoId
//? ---------------------------------------------------------------------- ?//

export const CreateNanoIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '나노아이디 👈 생성',
      description: `
      - 학부모의 나노아이디를 생성합니다.
      - 임시 로그인용 나노아이디를 발급하여 학부모가 간편하게 로그인할 수 있습니다.
      `,
    }),
    ApiParam({
      name: 'parentId',
      type: Number,
      description: '학부모 ID',
      required: true,
    }),
    ApiBody({
      type: CreateNanoIdDto,
    }),
    ApiCreatedResponseTemplate({
      description: '나노아이디 생성 완료',
      type: NanoId,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_USER],
      },
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [HttpErrorConstants.VALIDATE_ERROR],
      },
    ]),
  );
};
