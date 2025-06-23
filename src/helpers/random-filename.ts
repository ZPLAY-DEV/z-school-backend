import { customAlphabet } from 'nanoid';

export const randomFileName = (
  prefix: string,
  mimeType = 'image/jpeg',
): string => {
  const nanoid = customAlphabet('0123456789abcdef', 8);
  const [key, val] = mimeType.split('/');

  return `${prefix}-${nanoid(16)}.${val}`;
};
