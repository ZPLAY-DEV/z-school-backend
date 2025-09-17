// import * as admin from 'firebase-admin';

import { BookingStatus, Role, Weekday } from 'src/common/enums';

export interface IAwsConfig {
  defaultRegion: string;
  accessKeyId: string;
  secretAccessKey: string;
  cloudfrontUrl: string;
  endpoint?: string;
  sqsEndpoint?: string;
  // essentials
  sqsPqUrl: string;
  sqsDlqUrl: string;
  s3FilesBucket: string;
  // s3LogsBucket: string;
  // firehoseStreamName: string;
  ssmParameterName: string;
}
export interface IRdbConfig {
  engine: string;
  host: string;
  port: number;
  dbname: string;
  username: string;
  password: string;
}
export interface IRmqConfig {
  user: string;
  password: string;
  host: string;
  queue: string;
}
export interface IRedisConfig {
  host: string;
  port: number;
}
export interface IJwtConfig {
  authSecret: string;
  refreshSecret: number;
}
export interface IGoogleConfig {
  clientId: string;
  secret: string;
}
export interface IFirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}
// export interface INaverConfig {
//   accessKey: string;
//   secretKey: string;
//   smsServiceId: string;
//   smsSecretKey: string;
//   smsphone: string;
//   alimtalkServiceId: string;
//   plusFriendId: string;
// }
export interface IMessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}
export interface IKeyVal {
  key: string;
  val: string;
}
export interface IPackCompositeIds {
  artistId: number;
  artworkIds: number[];
}
export interface IShortItem {
  id: number;
  image: string;
  title: string;
}
export interface IShortArtist {
  id: number;
  name: string;
  avatar: string;
  items: Array<IShortItem>;
}
export interface IPaginationMeta {
  itemsPerPage: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  sortBy: any;
}

export interface IPaginationData {
  data: any[];
  meta: IPaginationMeta;
}

export interface IExtendedItemTimer {
  itemId: number;
  userId: number;
  amount: number;
  closingTime: string;
}

export interface IPortOneConfig {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
}

export interface IPortOneCancelData {
  imp_uid: string;
  merchant_uid: string;
  amount: number;
  tax_free: number;
  checksum: number;
  reason: string;
  refund_holder: string;
  refund_bank: string;
  refund_account: string;
  refund_tel: string;
}

export interface IEventButton {
  label: string;
  buttonType: 'info' | 'success' | 'error' | 'warn';
  location: string | null;
  target: string;
  targetArgs: number | null;
}

export interface ICounts {
  users: number;
  events: number;
  polls: number;
  feeds: number;
}

// FCM data payload requires all values to be strings
export interface IFcmData {
  [key: string]: string; // one size fits all approach may be excused for now.
}

export interface IPicture {
  tag: string;
  url: string;
}

export interface IVideo {
  name: string;
  url: string;
}

export interface IOrigin {
  name: string;
  origin: string;
}

export interface IParagraph {
  headline: string;
  body: string;
}

export interface IOptionLabel {
  title: string; // ex) 사이즈
  items: string[] | null;
}

export interface IHistory {
  time: Date;
  status: {
    code: string;
    name: string;
  };
  description: string;
}
export interface IRequestUser {
  id: number;
  username: string;
  role: Role;
  refreshToken?: string;
}
export interface INextStop {
  place: string;
  name: string | null;
  phone: string | null;
}

//? ---------------------------------------------------------------------- ?//
//? Refactor By Types -> Interface
//? ---------------------------------------------------------------------- ?//

export type FanItem = {
  username: string;
  phone: string;
  notifyKakao: number;
  userId: number;
  name: string;
  start: string;
  end: string;
};

export interface IUploadedFile {
  size: number;
  path: string;
  type: string;
  name: string | null;
}

export interface IS3Urls {
  uploadUrl: string;
  fileUrl: string;
}

// S3 관련 확장 인터페이스들
export interface IS3UploadResult {
  key: string;
  bucket: string;
  etag?: string;
  size?: number;
}

export interface IS3DeleteResult {
  success: boolean;
  key: string;
  deletedAt: Date;
}

export interface IS3FileInfo {
  exists: boolean;
  key: string;
  size?: number;
  lastModified?: Date;
  contentType?: string;
}

export interface IImageUploadOptions {
  expiresIn?: number; // seconds
  maxFileSize?: number; // bytes
  allowedMimeTypes?: string[];
  generateThumbnail?: boolean;
}

/**
 * DynamoDB API 응답용 제네릭 인터페이스
 * @template T - 응답 아이템의 타입
 */
export interface DynamoResponse<T = any> {
  /** 실제 반환된 아이템 배열 */
  items: T[];
  /** 반환된 아이템의 개수 */
  count: number;
  /** 다음 페이지를 위한 인코딩된 cursor (있는 경우) */
  nextCursor?: string;
  /** 더 많은 데이터가 있는지 여부 */
  hasMore: boolean;
}

// export type FirebaseUser = admin.auth.DecodedIdToken;

// export type StaleToken = {
//   userId: number;
//   pushToken: string;
// };

// export type NumberData = {
//   data: number;
// };

// export type AnyData = {
//   data: any;
// };

// export type EmailSubscriber = {
//   email: string;
//   name: string | null;
// };

export type Tokens = {
  accessToken: string;
  // refreshToken: string;
  expiresIn: number;
  // refreshTokenExpiry: number;
};

export type ITimeRange = {
  weekday: Weekday;
  start: string;
  end: string;
};

export interface IBookingSnapshotItem {
  termId: number;
  offeringId: number;
  studentId: number;
  lessonName: string;
  status: BookingStatus;
  waitingPosition: number;
}

export interface IPickKeys {
  studentId: number;
  groupId: number;
  offeringId: number;
  termId: number;
  start: string;
  end: string;
}

export interface ICalendarDay {
  start: string;
  end: string;
  isClassDay: boolean; // 수업이 있는지 여부
}
export interface HttpErrorFormat {
  error: string;
  description?: string;
  message: string;
}

// export type ReadStat = {
//   id: number;
//   name: string;
//   grade: number;
//   class: string;
//   studentCode: number;
//   link: string | null;
//   read: boolean;
// };
