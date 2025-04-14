import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
@Injectable()
export class HashPasswordPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transform(value: { password?: string }, _metadata: ArgumentMetadata) {
    if ('password' in value && typeof value.password === 'string') {
      const rule =
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{6,}$/;
      if (!rule.test(value.password)) {
        throw new BadRequestException(`invalid password format`);
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(value.password, salt);
      value = {
        ...value,
        password: passwordHash,
      };
    }

    return value;
  }
}
