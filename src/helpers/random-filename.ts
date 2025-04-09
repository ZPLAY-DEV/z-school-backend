import { format } from 'date-fns';
// import { File } from 'multer';
import { extname } from 'path';
import { v4 } from 'uuid';

export const randomImage = (file): string => {
  const ids = v4().split('-');
  const timestamp = Date.now();
  const ext = extname(file.originalname as string);

  return `${timestamp}-${ids[1]}-${ids[2]}-${ids[3]}${ext}`;
};

export const randomJpeg = (): string => {
  const ids = v4().split('-');
  const timestamp = Date.now();

  return `${timestamp}-${ids[1]}-${ids[2]}-${ids[3]}.jpg`;
};

export const randomName = (prefix: string, mimeType = 'image/jpeg'): string => {
  const ids = v4().split('-');
  const [key, val] = mimeType.split('/');

  if (key === 'image' || key === 'video') {
    return `${prefix}-${ids[1]}-${ids[2]}-${ids[3]}.${val}`;
  }

  return `${prefix}-${ids[1]}-${ids[2]}-${ids[3]}`;
};

export const randomImageName = (
  prefix: string,
  type = 'image/jpeg',
): string => {
  const ids = v4().split('-');
  const now = new Date();
  const timestamp = format(now, 'yyMMdd-HHmmss');
  const [key, val] = type.split('/');

  if (key === 'image' || key === 'video') {
    return `${prefix}-${timestamp}-${ids[1]}.${val}`;
  }

  return `${prefix}-${timestamp}-${ids[1]}`;
};
