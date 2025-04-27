export function parseRangeToArray(input: string): number[] {
  const match = input.match(/^(\d+)\s*[-~]\s*(\d+)$/);

  if (!match) {
    throw new Error(`Invalid range format: ${input}`);
  }

  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);

  if (start > end) {
    return [];
  }

  const result: number[] = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }

  return result;
}
