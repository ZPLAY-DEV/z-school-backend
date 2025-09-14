import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { IAttendanceKey } from 'src/domain/attendance/entities/attendance.interface';

/**
 * DynamoDB cursor를 자동으로 디코딩하는 파라미터 데코레이터
 * URL 쿼리 파라미터의 'cursor' 값을 IAttendanceKey 객체로 변환
 *
 * @example
 * ```typescript
 * @Get()
 * async getByGroupId(
 *   @Query('groupId') groupId?: number,
 *   @Cursor() lastKey?: IAttendanceKey,  // 자동으로 디코딩됨
 *   @Query('count') count?: number,
 * ): Promise<DynamoResponse<IAttendance>> {
 *   // lastKey는 이미 IAttendanceKey 객체로 변환되어 있음
 * }
 * ```
 */
export const Cursor = createParamDecorator(
  (data: unknown, context: ExecutionContext): IAttendanceKey | undefined => {
    const request = context.switchToHttp().getRequest();
    const cursor = request.query.cursor;

    if (!cursor) {
      return undefined;
    }

    try {
      // URL-safe JSON 방식 사용 (더 안전하고 확장 가능)
      const decoded = decodeURIComponent(cursor as string);
      const cursorData = JSON.parse(decoded) as {
        groupKey: string;
        dailyStudentKey: string;
      };

      if (!cursorData.groupKey || !cursorData.dailyStudentKey) {
        throw new Error('Invalid cursor structure');
      }

      return {
        groupKey: cursorData.groupKey,
        dailyStudentKey: cursorData.dailyStudentKey,
      };
    } catch {
      throw new BadRequestException('유효하지 않은 커서 형식입니다.');
    }
  },
);

/**
 * DynamoDB cursor 인코딩/디코딩 유틸리티 클래스
 */
export class CursorUtils {
  /**
   * IAttendanceKey 객체를 URL-safe 문자열로 인코딩
   * @param lastKey - 인코딩할 키 객체
   * @returns 인코딩된 문자열
   */
  static encode(lastKey: IAttendanceKey): string {
    try {
      return encodeURIComponent(JSON.stringify(lastKey));
    } catch {
      throw new BadRequestException('커서 생성에 실패했습니다.');
    }
  }

  /**
   * 인코딩된 문자열을 IAttendanceKey 객체로 디코딩
   * @param cursor - 디코딩할 문자열
   * @returns 디코딩된 키 객체
   */
  static decode(cursor: string): IAttendanceKey {
    try {
      const decoded = decodeURIComponent(cursor);
      const cursorData = JSON.parse(decoded) as {
        groupKey: string;
        dailyStudentKey: string;
      };

      if (!cursorData.groupKey || !cursorData.dailyStudentKey) {
        throw new Error('Invalid cursor structure');
      }

      return cursorData;
    } catch {
      throw new BadRequestException('유효하지 않은 커서 형식입니다.');
    }
  }
}
