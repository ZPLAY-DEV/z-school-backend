/**
 * Convert message to message type.
 */
export function parseMessageType(msg: string): string {
  if (msg.includes('인증번호')) {
    return '인증번호';
  }
  if (msg.includes('하교')) {
    return '하교';
  }
  if (msg.includes('출석')) {
    return '출석';
  }
  if (msg.includes('결석')) {
    return '결석';
  }
  if (msg.includes('지각')) {
    return '지각';
  }
  if (msg.includes('수업이 시작')) {
    return '수업시작';
  }
  if (msg.includes('수업이 종료')) {
    return '수업종료';
  }
  if (msg.includes('안내')) {
    return '안내';
  }
  return '기타';
}
