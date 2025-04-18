import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AppService {
  constructor() {}

  getVersion(): string {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      version: string;
    };
    return packageJson.version;
  }

  //? ---------------------------------------------------------------------- ?//
  //? cache bust
  //? ---------------------------------------------------------------------- ?//

  cacheBust(): string {
    //! POSTMAN 에서 x-clear-cache 헤더 추가하기 떄문에 REDIS 캐시삭제가 동작함.
    return `🗑️ cleared Redis cache`;
  }
}
