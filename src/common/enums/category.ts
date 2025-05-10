export enum Category {
  FREE_CUSTOM = 'free_custom', // 늘봄맞춤무료
  FREE_CARE = 'free_care', // 돌봄선택무료
  FREE_OPTIONAL = 'free_optional', // 늘봄선택무료
  PAID_OPTIONAL = 'paid_optional', // 늘봄선택유료
}

//? CategoryLabels[Category.FREE_CUSTOM] returns "늘봄맞춤무료"
export const CategoryLabels: Record<Category, string> = {
  [Category.FREE_CUSTOM]: '늘봄맞춤무료',
  [Category.FREE_CARE]: '돌봄선택무료',
  [Category.FREE_OPTIONAL]: '늘봄선택무료',
  [Category.PAID_OPTIONAL]: '늘봄선택유료',
};
