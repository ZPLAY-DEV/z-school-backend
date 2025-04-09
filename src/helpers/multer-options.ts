import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const multerOptions = {
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('unsupported media format'), false);
    }
  },
  storage: memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 200 },
};
