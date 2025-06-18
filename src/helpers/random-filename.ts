// import { File } from 'multer';
import { customAlphabet } from 'nanoid';

// export const randomImage = (file): string => {
//   const ids = v4().split('-');
//   const timestamp = Date.now();
//   const ext = extname(file.originalname as string);

//   return `${timestamp}-${ids[1]}-${ids[2]}-${ids[3]}${ext}`;
// };

// export const randomJpeg = (): string => {
//   const ids = v4().split('-');
//   const timestamp = Date.now();

//   return `${timestamp}-${ids[1]}-${ids[2]}-${ids[3]}.jpg`;
// };

export const randomFileName = (
  prefix: string,
  mimeType = 'image/jpeg',
): string => {
  const nanoid = customAlphabet('0123456789abcdef', 8);
  const [key, val] = mimeType.split('/');

  return `${prefix}-${nanoid(16)}.${val}`;
};
