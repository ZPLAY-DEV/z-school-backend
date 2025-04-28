import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { isValid, parse, isAfter } from 'date-fns';

/**
 * start와 end 필드의 날짜 범위를 검증하는 커스텀 데코레이터
 * @param property 비교 대상 필드 (예: 'start')
 * @param validationOptions class-validator 옵션
 */
export function IsValidDateRange(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDateRange',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];

          // 날짜 형식 검증 (YYYY-MM-DD)
          const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (
            !dateFormatRegex.test(value as string) ||
            !dateFormatRegex.test(relatedValue as string)
          ) {
            return false;
          }

          // Date 객체로 파싱
          const date = parse(value as string, 'yyyy-MM-dd', new Date());
          const relatedDate = parse(
            relatedValue as string,
            'yyyy-MM-dd',
            new Date(),
          );

          // 유효한 날짜인지 체크
          if (!isValid(date) || !isValid(relatedDate)) {
            return false;
          }

          // end가 start보다 크거나 같은지 체크
          return !isAfter(relatedDate, date); // relatedDate(start) <= date(end)
        },
        defaultMessage(args: ValidationArguments) {
          return `${propertyName} must be a valid date range with ${args.constraints[0]}`;
        },
      },
    });
  };
}
