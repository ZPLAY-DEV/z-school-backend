import { Transform } from 'class-transformer';

/**
 * 범위 표현식을 개별 학년 배열로 확장하는 헬퍼 함수
 * @param range "1-3" 또는 "1~6" 형식의 범위 문자열
 * @returns 확장된 숫자 배열 (예: [1, 2, 3])
 */
function expandRange(range: string): number[] {
  // 모든 공백 제거 후 trim (예: " 1 - 3 " → "1-3")
  const normalized = range.replace(/\s+/g, '').trim();

  // 하이픈 또는 물결표로 범위 표현식인지 확인
  const rangeMatch = normalized.match(/^(\d+)[-~](\d+)$/);

  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);

    // 시작이 끝보다 크면 빈 배열 반환
    if (start > end) {
      return [];
    }

    // 범위 확장: 1-3 → [1, 2, 3]
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // 범위 표현식이 아니면 단일 숫자로 파싱
  const num = parseInt(normalized);
  return isNaN(num) ? [] : [num];
}

/**
 * allowedGrades 필드의 타입 변환을 처리하는 데코레이터
 *
 * @description
 * - string → string: 범위 표현식 확장 후 정규화
 *   - "1,2,3" → "1,2,3"
 *   - "1-3" → "1,2,3"
 *   - "1~6" → "1,2,3,4,5,6"
 *   - "1,3-5,7" → "1,3,4,5,7"
 * - number[] → string: 쉼표로 조인 (예: [1, 2, 3] → "1,2,3")
 * - 자동 정렬 및 중복 제거 수행
 *
 * @example
 * ```typescript
 * class CreateGroupDto {
 *   @AllowedGradesTransform()
 *   allowedGrades?: string | number[];
 * }
 * ```
 */
export function AllowedGradesTransform() {
  return Transform(({ value }: { value: unknown }) => {
    if (!value) {
      return value as string | undefined | null;
    }

    let grades: number[] = [];

    // 이미 string인 경우
    if (typeof value === 'string') {
      // 쉼표로 분리 후 각 항목 처리
      const parts = value.split(',').map((part) => part.trim());

      for (const part of parts) {
        if (!part) continue; // 빈 문자열 스킵

        // 범위 표현식 확장 (예: "1-3" → [1, 2, 3])
        const expanded = expandRange(part);
        grades.push(...expanded);
      }
    }
    // number[] 배열인 경우
    else if (Array.isArray(value)) {
      grades = value
        .map((g) => {
          const num = typeof g === 'number' ? g : parseInt(String(g));
          return isNaN(num) ? null : num;
        })
        .filter((g): g is number => g !== null);
    }
    // 그 외의 경우
    else {
      return value as string; // validation에서 걸릴 것
    }

    // 중복 제거 및 정렬
    const uniqueGrades = Array.from(new Set(grades)).sort((a, b) => a - b);

    return uniqueGrades.join(',');
  });
}
