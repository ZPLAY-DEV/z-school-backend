//! 목적) http cache interpreter 에서 사용
export function getBaseEntityFromUrl(baseUrl: string): string {
  return baseUrl.split('/')[2];
}

export function getAllEntitiesFromUrl(baseUrl: string): string[] {
  const entities = baseUrl
    .split('/') // '/' 기준으로 split
    .filter(
      (
        segment, // 필터링 조건
      ) =>
        segment && // 빈 문자열이 아닌 것만
        isNaN(Number(segment)) && // 숫자가 아닌 것만
        segment.endsWith('s'), // 's'로 끝나는 것만
    );

  //? cache 에 필요한 edge cases 등록 -------------------------------------------- ?//
  if (entities.includes('deliveries')) {
    return [...entities, 'orders'];
  }

  return entities;
}
