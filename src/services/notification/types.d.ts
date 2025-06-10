// s3 partitioning metadata
export type PartitioningMeta = {
  type: string; // ping | dispatch
  school: string; // 학교아이디
  role: string; // `PARENT` 또는 `INSTRUCTOR`
};

export type PhonePair = {
  id: number; // firehose 로깅을 위함
  phone: string;
};
export type TokenPair = {
  id: number; // firehose 로깅을 위함
  token: string;
};
export type MixedPair = {
  id: number; // firehose 로깅을 위함
  token?: string | null;
  phone?: string;
};

export type MessageBody = {
  title?: string;
  body: string;
};

export type FcmData = {
  role: string; // `PARENT` 또는 `INSTRUCTOR`
  target?: string; // for Client Routing
  targetArgs?: string; // for Client Routing
};

// -------------------------------------------------------------------------- //

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
  error?: Error;
  retryable?: boolean; // 재시도 가능한 에러인지 표시
};
