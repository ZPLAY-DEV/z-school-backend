export const formatNumber = (val: number) => {
  return new Intl.NumberFormat('ko-KR').format(val);
};
