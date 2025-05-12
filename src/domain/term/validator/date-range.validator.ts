import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isAfter, isBefore, isValid, parse, set } from 'date-fns';

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

/**
 * bookingStart와 bookingEnd 필드의 날짜-시간 범위를 검증하는 커스텀 데코레이터
 * @param property 비교 대상 필드 (예: 'bookingStart')
 * @param validationOptions class-validator 옵션
 */
export function IsValidDateTimeRange(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDateTimeRange',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];

          // optional 필드 처리
          if (value === undefined || relatedValue === undefined) {
            return true; // 둘 중 하나라도 없으면 검증 생략
          }

          // Date 객체로 변환
          const date =
            value instanceof Date ? value : new Date(value as string);
          const relatedDate =
            relatedValue instanceof Date
              ? relatedValue
              : new Date(relatedValue as string);

          // 유효한 날짜인지 체크
          if (!isValid(date) || !isValid(relatedDate)) {
            return false;
          }

          // bookingEnd가 bookingStart보다 크거나 같은지 체크
          return !isAfter(relatedDate, date); // relatedDate(bookingStart) <= date(bookingEnd)
        },
        defaultMessage(args: ValidationArguments) {
          return `${propertyName} must be a valid date-time range with ${args.constraints[0]}`;
        },
      },
    });
  };
}

/**
 * bookingStart와 bookingEnd가 start와 end 범위 내에 있는지 검증하는 커스텀 데코레이터
 * @param startProperty 시작 날짜 필드 (예: 'start')
 * @param endProperty 종료 날짜 필드 (예: 'end')
 * @param validationOptions class-validator 옵션
 */
export function IsDateTimeWithinRange(
  startProperty: string,
  endProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateTimeWithinRange',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [startProperty, endProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [startPropertyName, endPropertyName] = args.constraints;
          const obj = args.object as Record<string, unknown>;
          const startValue = obj[startPropertyName] as string;
          const endValue = obj[endPropertyName] as string;

          // optional 필드 처리
          if (value === undefined) {
            return true; // 값이 없으면 검증 생략
          }

          // start, end가 YYYY-MM-DD 형식인지 확인
          const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (
            !dateFormatRegex.test(startValue) ||
            !dateFormatRegex.test(endValue)
          ) {
            return false;
          }

          // start와 end를 Date 객체로 파싱
          const startDate = parse(startValue, 'yyyy-MM-dd', new Date());
          // end는 당일 23:59:59로 설정하여 시간대 문제 픽스
          const endDate = set(parse(endValue, 'yyyy-MM-dd', new Date()), {
            hours: 23,
            minutes: 59,
            seconds: 59,
            milliseconds: 999,
          });

          // 유효한 날짜인지 확인
          if (!isValid(startDate) || !isValid(endDate)) {
            return false;
          }

          // value(bookingStart 또는 bookingEnd)가 유효한 Date인지 확인
          const date =
            value instanceof Date ? value : new Date(value as string);
          if (!isValid(date)) {
            return false;
          }

          // bookingStart는 startDate 이후, bookingEnd는 endDate 이전이어야 함
          if (propertyName.includes('bookingStart')) {
            return !isBefore(date, startDate); // bookingStart >= start
          } else if (propertyName.includes('bookingEnd')) {
            return !isAfter(date, endDate); // bookingEnd <= end
          }

          return false;
        },
        defaultMessage(args: ValidationArguments) {
          const [startPropertyName, endPropertyName] = args.constraints;
          return `${args.property} must be within the range of ${startPropertyName} and ${endPropertyName}`;
        },
      },
    });
  };
}

/**
 * bookingStart와 bookingEnd가 start 날짜 이전인지 검증하는 커스텀 데코레이터
 * @param startProperty 시작 날짜 필드 (예: 'start')
 * @param validationOptions class-validator 옵션
 */
export function IsDateTimePriorToDate(
  startProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateTimePriorToDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [startProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [startPropertyName] = args.constraints;
          const obj = args.object as Record<string, unknown>;
          const startValue = obj[startPropertyName] as string | undefined;

          // 값이 없으면 검증 생략
          if (value === undefined) return true;

          // start가 문자열이 아니거나 없으면 검증 생략
          if (typeof startValue !== 'string') return true;

          // YYYY-MM-DD 형식이 아니면 검증 생략
          const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateFormatRegex.test(startValue)) return true;

          // start를 Date 객체로 파싱
          const startDate = parse(startValue, 'yyyy-MM-dd', new Date());
          if (!isValid(startDate)) return true;

          // value(bookingStart 또는 bookingEnd)가 유효한 Date인지 확인
          const date =
            value instanceof Date ? value : new Date(value as string);
          if (!isValid(date)) return false;

          // bookingStart 또는 bookingEnd가 startDate 이전인지 확인
          return isBefore(date, startDate);
        },
        defaultMessage(args: ValidationArguments) {
          const [startPropertyName] = args.constraints;
          return `${args.property} must be prior to ${startPropertyName}`;
        },
      },
    });
  };
}
