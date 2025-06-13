import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { MainTarget } from 'src/common/enums';
import { IDispatchTarget } from 'src/common/interfaces';

// 커스텀 Target Validator
@ValidatorConstraint({ name: 'TargetValidator', async: false })
export class TargetValidator implements ValidatorConstraintInterface {
  validate(value: IDispatchTarget): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const { mainTarget, detail } = value;

    // mainTarget 검증
    if (!Object.values(MainTarget).includes(mainTarget)) {
      return false;
    }

    // detail 검증
    if (!Array.isArray(detail) || detail.length === 0 || detail.length > 100) {
      return false;
    }

    return detail.every(
      (item) => typeof item === 'string' && item.trim().length > 0,
    );
  }

  defaultMessage(): string {
    return 'Invalid target object: mainTarget must be one of [학년별, 강좌별, 학생별, 강사별], detail must be a non-empty array of non-empty strings with max length 100';
  }
}
