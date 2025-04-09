import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';

/**
 * 스웨거 문서 설정
 */
export const swaggerConfig = new DocumentBuilder()
  .setTitle('Scoollink Rest API Docs')
  .setDescription('scoollink rest api docs')
  .setVersion('3.0')
  .addBearerAuth({
    type: 'http',
    scheme: 'Bearer',
    name: 'authorization',
    bearerFormat: 'JWT',
    in: 'header',
  })
  .build();

/**
 * 스웨거 문서 초기화
 */
export const initSwagger = (app: INestApplication) => {
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument, swaggerOptions);
};

/**
 * Swagger Custom 옵션 설정
 */
export const swaggerOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    defaultModelsExpandDepth: 1,
    docExpansion: 'none',
    persistAuthorization: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
    displayRequestDuration: true,
    showCommonExtensions: true,
    showExtensions: true,
  },
};
