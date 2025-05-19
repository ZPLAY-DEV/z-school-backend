import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Role } from 'src/common/enums';

@ValidatorConstraint({ name: 'groupIdForManager', async: false })
export class GroupIdForManagerConstraint
  implements ValidatorConstraintInterface
{
  validate(groupId: number | undefined, args: ValidationArguments): boolean {
    const object = args.object as any;
    const userRole: Role = object.userRole;

    // userRole이 MANAGER일 때 groupId가 있으면 false (에러 발생)
    if (userRole === Role.MANAGER && groupId !== undefined) {
      return false;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return `groupId must not be provided when userRole is MANAGER -> groupId: ${args.value}`;
  }
}
