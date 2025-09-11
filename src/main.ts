import './instrument'; // import this first!

import {
  BadRequestException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import helmet from 'helmet';
import { AppModule } from 'src/app.module';
import { initSwagger } from './common/swagger/swagger-config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const configService = app.get<ConfigService>(ConfigService);

  // app.connectMicroservice({
  //   transport: Transport.REDIS,
  //   options: {
  //     host: configService.getOrThrow('redis.host'),
  //     port: configService.getOrThrow('redis.port'),
  //   },
  // });
  // await app.startAllMicroservices();
  // const redisIoAdapter = new RedisIoAdapter(app);
  // await redisIoAdapter.connectToRedis();
  // app.useWebSocketAdapter(redisIoAdapter);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true, // 정의되지 않은 속성 금지
      validateCustomDecorators: true, // 커스텀 데코레이터 유효성 검사
      exceptionFactory: (e) => {
        console.log('❌ error', e);
        // MyCatchAllFilter에서 구체적인 오류 메시지 처리
        return new BadRequestException(e);
      },
    }),
  );

  // firebase config
  initializeApp({
    credential: applicationDefault(),
    // databaseURL: 'https://flea-item-dev.firebaseio.com',
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const corsOrigins = [
    '*',
    'http://localhost:3000',
    'https://schoolhub.co.kr',
    'https://admin.schoolhub.co.kr',
    'https://app.schoolhub.co.kr',
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Helmet 설정을 CORS와 호환되도록 조정
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(helmet.hidePoweredBy());
  app.use(cookieParser());

  // see https://expressjs.com/en/guide/behind-proxies.html
  app.set('trust proxy', true);

  if (configService.get<string>('nodeEnv') === 'dev') {
    initSwagger(app);
  }

  const port = Number(configService.get<string>('appPort')) || 3001;
  await app.listen(port, () => {
    console.log(
      `🚀 Application is running on port ${port} in ${configService.get<string>('nodeEnv')} mode!`,
    );
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
