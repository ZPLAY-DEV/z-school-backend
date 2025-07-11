export enum Category {
  FREE_CUSTOM = 'FREE_CUSTOM', // 늘봄맞춤무료
  FREE_CARE = 'FREE_CARE', // 돌봄선택무료
  FREE_OPTIONAL = 'FREE_OPTIONAL', // 늘봄선택무료
  PAID_OPTIONAL = 'PAID_OPTIONAL', // 늘봄선택유료
}

//? CategoryLabels[Category.FREE_CUSTOM] returns "늘봄맞춤무료"
export const CategoryLabels: Record<Category, string> = {
  [Category.FREE_CUSTOM]: '맞춤형',
  [Category.FREE_CARE]: '돌봄',
  [Category.FREE_OPTIONAL]: '선택형(무료)',
  [Category.PAID_OPTIONAL]: '선택형(유료)',
};
