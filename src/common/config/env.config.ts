import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * cross-env 환경에 맞춰 bootstrap 시점에 env 파일을 로드
 */
export function loadEnvConfig() {
  const env = process.env.NODE_ENV || 'development';
  const envFile = env === 'production' ? '.env.production' : '.env.development';

  const projectRoot = path.resolve(__dirname, '../../..');
  const commonEnvPath = path.join(projectRoot, '.env');
  const envPath = path.join(projectRoot, envFile);

  const commonResult = dotenv.config({ path: commonEnvPath });
  if (
    commonResult.error &&
    (commonResult.error as NodeJS.ErrnoException).code !== 'ENOENT'
  ) {
    console.error('Failed to load common .env:', commonResult.error);
  }

  const result = dotenv.config({ path: envPath, override: true });
  if (result.error) {
    console.error(`Failed to load ${envFile}:`, result.error);
    process.exit(1);
  }

  return { env, envFile };
}
