import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants as CommonHttpErrorConstants } from 'src/core/http/http-error-objects';
import { HttpErrorConstants as AuthHttpErrorConstants } from '../helper/http.error.object';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { UserCredentialsDto } from '../dto/user-credentials.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { HttpResponse } from 'src/core/http/http-response';

// import { Tokens } from './../../../common/types/index';

/** register */
export const RegisterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '회원가입',
    }),
    ApiBody({
      type: UserCredentialsDto,
    }),
    ApiCreatedResponseTemplate({
      description: '회원가입',
      // type: Tokens,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [
          CommonHttpErrorConstants.VALIDATE_ERROR,
          AuthHttpErrorConstants.INVALID_ROLE,
          AuthHttpErrorConstants.ALREADY_REGISTERED,
        ],
      },
      {},
    ]),
  );
};

/** reset password */
export const ResetPasswordDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '비밀번호 재설정',
    }),
    ApiBody({
      type: ResetPasswordDto,
    }),
    ApiOkResponseTemplate({
      description: '비밀번호 재설정',
      type: HttpResponse,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [AuthHttpErrorConstants.NOT_FOUND_PHONE],
      },
      {},
    ]),
  );
};
