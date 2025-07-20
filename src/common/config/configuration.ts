import { IAwsConfig, IRdbConfig } from 'src/common/interfaces';

/**
 * @Todo
 * - validator or joi
 * - 사용하지 않는 환경변수 제거 필요 ( 현재 보일러 플레이트에서 가져온 사용하지 않는 리소스가 너무 많음 )
 */
export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'dev',
  appPort: Number(process.env.APP_PORT ?? '3001'),
  appUrl: process.env.APP_URL,
  timeZone: process.env.TIME_ZONE,
  database: {
    engine: process.env.DB_ENGINE ?? 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    dbname: process.env.DB_NAME ?? 'school',
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? 'secret',
  } as IRdbConfig,
  redis: {
    host: process.env.REDIS_CACHE_HOST ?? 'localhost',
    port: process.env.REDIS_CACHE_PORT
      ? Number(process.env.REDIS_CACHE_PORT)
      : 6379,
    password: process.env.REDIS_CACHE_PASSWORD,
  },
  redisBooking: {
    host: process.env.REDIS_BOOKING_HOST ?? 'localhost',
    port: process.env.REDIS_BOOKING_PORT
      ? Number(process.env.REDIS_BOOKING_PORT)
      : 6379,
    password: process.env.REDIS_BOOKING_PASSWORD,
  },
  // redisPubSub: {
  //   host: process.env.REDIS_PUBSUB_HOST ?? 'localhost',
  //   port: process.env.REDIS_PUBSUB_PORT
  //     ? Number(process.env.REDIS_PUBSUB_PORT)
  //     : 6379,
  //   password: process.env.REDIS_PUBSUB_PASSWORD,
  // },
  jwt: {
    authSecret: process.env.AUTH_TOKEN_SECRET,
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    secret: process.env.GOOGLE_SECRET,
  },
  firebase:
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    './school-hub.fb-admin-key.json',
  aws: {
    defaultRegion: process.env.AWS_DEFAULT_REGION,
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    // secretsManagerEndpoint: process.env.AWS_SECRETS_MANAGER_ENDPOINT,
    // secretsDbArn: process.env.AWS_SECRETS_DB_ARN,
    s3Endpoint: process.env.AWS_S3_ENDPOINT,
    sqsEndpoint: process.env.AWS_SQS_ENDPOINT,
    firehoseEndpoint: process.env.AWS_FIREHOSE_ENDPOINT,
    // essentials
    cloudfrontUrl: process.env.AWS_CLOUDFRONT_URL,
    s3FilesBucket: process.env.AWS_S3_FILES_BUCKET,
    s3LogsBucket: process.env.AWS_S3_LOGS_BUCKET,
    sqsPqUrl: process.env.AWS_SQS_PQ_URL,
    sqsDlqUrl: process.env.AWS_SQS_DLQ_URL,
    firehoseStreamName: process.env.AWS_FIREHOSE_STREAM_NAME,
    ssmParameterName: process.env.AWS_SSM_PARAMETER_NAME,
  } as IAwsConfig,
  slack: {
    token: process.env.SLACK_TOKEN,
    activityChannel: process.env.SLACK_CHANNEL_ACTIVITY,
    errorChannel: process.env.SLACK_CHANNEL_ERROR,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
  aligo: {
    url: process.env.ALIGO_URL || 'https://apis.aligo.in',
    key: process.env.ALIGO_KEY || '',
    uid: process.env.ALIGO_UID || '',
  },
  neis: {
    apiKey: process.env.NEIS_API_KEY || '',
  },
});
