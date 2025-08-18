import { NotificationType } from 'src/common/enums/notification-type';

// s3 partitioning metadata
export type PartitioningMeta = {
  type: NotificationType; // REGISTRATION, NEWS, SURVERY, SCHOOL, CLASS, OTHER
  schoolId: number; // 학교아이디
  role: string; // `PARENT` 또는 `INSTRUCTOR`
};

export type PhonePair = {
  id: number; // 로깅을 위한 parentId
  phone: string;
};
export type TokenPair = {
  id: number; // 로깅을 위한 parentId
  token: string;
};
export type MixedPair = {
  id: number; // 로깅을 위한 parentId
  token?: string | null;
  phone?: string;
};

export type MessageBody = {
  title?: string;
  body: string;
};

export type FcmData = {
  role: string; // `PARENT` 또는 `INSTRUCTOR`
  page?: string; // for Client Routing
  args?: string; // for Client Routing
  uri?: string; // for Client Routing
};

// -------------------------------------------------------------------------- //

export type SingleFcmInput = TokenPair & MessageBody & FcmData;
export type SingleFcmMessage = TokenPair &
  MessageBody &
  FcmData &
  PartitioningMeta;
export type BroadcastFcmMessage = {
  tokenPairs: TokenPair[];
} & MessageBody &
  FcmData &
  PartitioningMeta;
export type MultiFcmMessages = {
  messages: (TokenPair & MessageBody & FcmData)[];
} & PartitioningMeta;

export type SingleSmsMessage = PhonePair & MessageBody & PartitioningMeta;
export type BroadcastSmsMessage = {
  phonePairs: PhonePair[];
} & MessageBody &
  PartitioningMeta;
export type MultiSmsMessages = {
  messages: (PhonePair & MessageBody)[];
} & PartitioningMeta;

export type MultiMixedMessages = {
  messages: (MixedPair & MessageBody & FcmData)[];
} & PartitioningMeta;

// -------------------------------------------------------------------------- //

export type NotificationResult = {
  success: boolean;
  messageId?: string;
  error?: Error;
  id?: number;
};
