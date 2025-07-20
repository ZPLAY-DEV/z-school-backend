import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
dotenv.config();

/** staged production 환경에 따른 마이그레이션 파일 셋업 */
if (process.env.NODE_ENV === 'dev') {
  console.log('migration dev environment');
  dotenv.config({ path: './.env.dev' });
} else {
  console.log('migration prod environment');
  dotenv.config({ path: './.env.prod' });
}

export default new DataSource({
  type: process.env.DB_ENGINE as 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: false,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  migrationsTableName: 'migrations',
  migrationsRun: false,
});
