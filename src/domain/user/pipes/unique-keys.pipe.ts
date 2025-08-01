import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { UserService } from 'src/domain/user/user.service';
@Injectable()
export class UniqueKeysPipe implements PipeTransform {
  constructor(private readonly userService: UserService) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transform(value: Record<string, any>, _metadata: ArgumentMetadata) {
    if (
      value.username &&
      Object.prototype.hasOwnProperty.call(value, 'username')
    ) {
      const user = await this.userService.findByUniqueKey({
        where: { username: value.username },
      });
      if (user != null) {
        throw new BadRequestException(`username already taken`);
      }
    }

    if (value.email && Object.prototype.hasOwnProperty.call(value, 'email')) {
      const user = await this.userService.findByUniqueKey({
        where: { email: value.email },
      });
      if (user != null) {
        throw new BadRequestException(`email already taken`);
      }
    }

    if (value.phone && Object.prototype.hasOwnProperty.call(value, 'phone')) {
      const user = await this.userService.findByUniqueKey({
        where: { phone: value.phone },
      });
      if (user != null) {
        throw new BadRequestException(`phone number already taken`);
      }
    }

    return value;
  }
}
