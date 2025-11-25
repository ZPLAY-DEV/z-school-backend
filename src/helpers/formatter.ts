export const formatNumber = (val: number) => {
  return new Intl.NumberFormat('ko-KR').format(val);
};

export function truncate(str: string, max?: number): string {
  const length = max ?? 250;
  return str.length > length ? str.slice(0, length) + '…' : str;
}

export function generateSlug(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, '-') // 공백을 하이픈으로
    .replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '') // 영문, 숫자, 한글(완성형+자모), 하이픈만 남기기
    .replace(/--+/g, '-') // 연속된 하이픈을 하나로
    .replace(/^-+/, '') // 시작 하이픈 제거
    .replace(/-+$/, '') // 끝 하이픈 제거
    .toLowerCase(); // 마지막에 소문자로 변환 (한글은 영향 없음)
}
