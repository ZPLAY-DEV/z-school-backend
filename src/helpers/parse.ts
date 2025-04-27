export function parseRangeToArray(input: string): number[] {
  // 단일 숫자 처리: 숫자만 있는 경우
  const singleNumberMatch = input.match(/^(\d+)$/);
  if (singleNumberMatch) {
    return [parseInt(singleNumberMatch[1], 10)];
  }

  // 범위 문자열 처리 (예: "1-6" 또는 "1~4")
  const rangeMatch = input.match(/^(\d+)\s*[-~]\s*(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);

    if (start > end) {
      return [];
    }

    const result: number[] = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }

    return result;
  }

  throw new Error(`Invalid range format: ${input}`);
}
