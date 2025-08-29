export const formatNumber = (val: number) => {
  return new Intl.NumberFormat('ko-KR').format(val);
};

export function truncate(str: string, max?: number): string {
  const length = max ?? 250;
  return str.length > length ? str.slice(0, length) + '…' : str;
}
