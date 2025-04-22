/**
 * @Todo
 * - validator or joi
 * - 사용하지 않는 환경변수 제거 필요 ( 현재 보일러 플레이트에서 가져온 사용하지 않는 리소스가 너무 많음 )
 */
export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'local',
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
  },
  redis: {
    host: process.env.REDIS_CACHE_HOST ?? 'localhost',
    port: process.env.REDIS_CACHE_PORT
      ? Number(process.env.REDIS_CACHE_PORT)
      : 6379,
    password: process.env.REDIS_CACHE_PASSWORD,
  },
  redisCache: {
    host: process.env.REDIS_CACHE_HOST ?? 'localhost',
    port: process.env.REDIS_CACHE_PORT
      ? Number(process.env.REDIS_CACHE_PORT)
      : 6379,
    password: process.env.REDIS_CACHE_PASSWORD,
  },
  redisPubSub: {
    host: process.env.REDIS_PUBSUB_HOST ?? 'localhost',
    port: process.env.REDIS_PUBSUB_PORT
      ? Number(process.env.REDIS_PUBSUB_PORT)
      : 6379,
    password: process.env.REDIS_PUBSUB_PASSWORD,
  },
  redisBooking: {
    host: process.env.REDIS_BOOKING_HOST ?? 'localhost',
    port: process.env.REDIS_BOOKING_PORT
      ? Number(process.env.REDIS_BOOKING_PORT)
      : 6379,
    password: process.env.REDIS_BOOKING_PASSWORD,
  },
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
    './fb-admin-gogi.account-key.json',
  aws: {
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    defaultRegion: process.env.AWS_DEFAULT_REGION,
    bucketName: process.env.AWS_BUCKET_NAME,
    cloudFrontUrl: process.env.AWS_CLOUDFRONT_URL,
    dbSecretsArn: process.env.MYSQL_SECRETS_ARN,
    sqsQueueUrl: process.env.AWS_SQS_QUEUE_URL,
  },
  naver: {
    accessKey: process.env.NAVER_ACCESS_KEY,
    secretKey: process.env.NAVER_SECRET_KEY,
    smsServiceId: process.env.NAVER_SMS_SERVICE_ID,
    smsSecretKey: process.env.NAVER_SMS_SECRET_KEY,
    smsphone: process.env.NAVER_SMS_PHONE_NUMBER,
    alimtalkServiceId: process.env.NAVER_ALIMTALK_SERVICE_ID,
    plusFriendId: process.env.NAVER_PLUS_FRIEND_ID,
  },
  slack: {
    token: process.env.SLACK_TOKEN,
    activityChannel: process.env.SLACK_CHANNEL_ACTIVITY,
    errorChannel: process.env.SLACK_CHANNEL_ERROR,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
  toss: {
    secretKey: process.env.TOSS_SECRET_KEY,
    clientKey: process.env.TOSS_CLIENT_KEY,
    apiBaseUrl: 'https://api.tosspayments.com/v1',
  },
  deliveryTracker: {
    clientId: process.env.DELIVERY_TRACKER_CLIENT_ID,
    clientSecret: process.env.DELIVERY_TRACKER_CLIENT_SECRET,
  },
});
