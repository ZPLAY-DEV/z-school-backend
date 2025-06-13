// import * as admin from 'firebase-admin';

import { BookingStatus, MainTarget, Role, Weekday } from 'src/common/enums';

export interface IDatabaseConfig {
  engine: string;
  host: string;
  port: number;
  username: string;
  password: string;
  dbname: string;
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
export interface IAwsConfig {
  accessKey: string;
  secretAccessKey: string;
  defaultRegion: string;
  bucketName: string;
  cloudFrontUrl: string;
  dbSecretsArn: string;
}
export interface INaverConfig {
  accessKey: string;
  secretKey: string;
  smsServiceId: string;
  smsSecretKey: string;
  smsphone: string;
  alimtalkServiceId: string;
  plusFriendId: string;
}
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
  imageUrl: string;
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
  startedOn: string;
}

export interface ICalendarDay {
  start: string;
  end: string;
  classOn: boolean; // 수업이 있는지 여부
}

//? ---------------------------------------------------------------------- ?//
//? Dispatch Common Interface
//? ---------------------------------------------------------------------- ?//

/**
 * 발송 대상자의 상세 유형
 * @param mainTarget 발송 대상자의 상세 유형 ENUM ( 학년별, 강좌별, 학생별, 강사별 )
 * @param detail 발송 대상자의 상세 유형 String[] ( 학년, 강좌, 학생, 강사 )
 */
export interface IDispatchTarget {
  mainTarget: MainTarget;
  /**
   * @todo label으로 네이밍을 변경
   */
  detail: string[];
}

/**
 * Mixed 발송 대상자의 상세 유형
 * @param id parentId
 * @param token parent.pushToken
 * @param phone parent.phone
 * @param title dto.title (선택적) -> title은 큰 의미 없음.
 * @param body dto.title 실제 create-dispatch의 title 값을 삽입
 * @param role ENUM으로 구분 필요
 * @param target nanoId.target
 * @param targetArgs nanoId.targetArgs ( sms redirection path )
 */
export interface IMixedTargetMessage {
  id: number;
  token: string;
  phone: string;
  title?: string;
  body: string;
  role: 'PARENT';
  target: string;
  targetArgs: string;
}

/**
 * 발송 응답 인터페이스
 * @param messages IMixedTargetMessage[]
 * @param type 'ping.class'
 * @param school 학교 아이디 ( toString으로 파싱해야함)
 * @param role 'PARENT' | 'INSTRUCTOR'
 */
export interface IDispatchResponse {
  messages: IMixedTargetMessage[];
  type: 'ping.class';
  school: string;
  role: 'PARENT';
}
