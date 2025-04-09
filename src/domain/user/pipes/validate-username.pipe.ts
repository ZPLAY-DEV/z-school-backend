import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ValidateUsernamePipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: any, _metadata: ArgumentMetadata) {
    if (value.hasOwnProperty('username')) {
      const rule = /^[ㄱ-ㅎ가-힣a-zA-Z0-9 ]+$/;
      if (!rule.test(value.username)) {
        throw new BadRequestException('invalid username format');
      }

      return {
        ...value,
      };
    }

    return value;
  }
}
