export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const areTheyEqual = <T>(arr1: T[], arr2: T[]): boolean => {
  // 길이가 다르면 바로 false 반환
  if (arr1.length !== arr2.length) return false;

  // Set으로 변환하여 중복 제거
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);

  // Set의 크기가 다르면 false 반환
  if (set1.size !== set2.size) return false;

  // set1의 모든 요소가 set2에 있는지 확인
  return [...set1].every((item) => set2.has(item));
};
