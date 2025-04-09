export const formatPhone = (value: string | null) =>
  value ? value.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3') : `정보없음`;

export const formatNumber = (val: number) => {
  return new Intl.NumberFormat('ko-KR').format(val);
};
