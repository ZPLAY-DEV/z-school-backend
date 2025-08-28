/**
 * 전화번호에서 숫자가 아닌 문자를 모두 제거합니다.
 * @param phone 정리할 전화번호 문자열
 * @returns 숫자만 남은 전화번호 문자열
 */
export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/\D/g, '');
}

export function formatPhone(phone?: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
}
