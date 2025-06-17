import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * 간단한 상태 코드만 표시하는 데코레이터들
 */

// 단일 상태 코드 표시
export const ApiStatus = (status: number, description?: string) => {
  return ApiResponse({
    status,
    description: description || `HTTP ${status}`,
  });
};

// 여러 상태 코드 한번에 표시
export const ApiStatuses = (...statuses: number[]) => {
  return applyDecorators(...statuses.map((status) => ApiStatus(status)));
};
