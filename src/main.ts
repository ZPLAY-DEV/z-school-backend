import {
  BadRequestException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import helmet from 'helmet';
import { AppModule } from 'src/app.module';
import { RedisIoAdapter } from 'src/common/adapters/redis-io-adapter';
import { loadEnvConfig } from './common/config/env.config';
import { initSwagger } from './common/swagger/swagger-config';
import './instrument'; // import this first!
// import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  // const configService = app.get<ConfigService>(ConfigService);
  const { env } = loadEnvConfig();

  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_CACHE_PORT),
      // host: configService.getOrThrow('redis.host'),
      // port: configService.getOrThrow('redis.port'),
    },
  });
  await app.startAllMicroservices();

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true, // 정의되지 않은 속성 금지
      validateCustomDecorators: true, // 커스텀 데코레이터 유효성 검사
      exceptionFactory: (e) => {
        console.log('❌ error', e);
        // ValidationCatchAllFilter에서 구체적인 오류 메시지 처리
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
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://zschool.com',
      'https://zschool.kr',
    ],
    credentials: true, // 쿠키를 포함한 요청을 허용하려면 true로 설정
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // 허용할 HTTP 메서드
  });
  app.use(helmet());
  app.use(helmet.hidePoweredBy());
  app.use(cookieParser());

  // see https://expressjs.com/en/guide/behind-proxies.html
  app.set('trust proxy', true);

  if (env === 'development') {
    initSwagger(app);
  }

  const port = Number(process.env.APP_PORT) || 3001;
  await app.listen(port, () => {
    console.log(`🚀 Application is running on port ${port} in ${env} mode!`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
