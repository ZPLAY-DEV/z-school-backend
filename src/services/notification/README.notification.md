# NotificationService

NotificationService는 **책임 분리 원칙**에 따라 FCM/SMS/Mixed 전송 방식을 명확히 구분하는 7가지 저수준 메서드를 제공합니다:

## 📨 알림 전송 메서드들

### 하이브리드 메서드
1. **`send()`** - FCM/SMS 혼합 메시지 발송

## 🚀 책임 분리 아키텍처

모든 알림 데이터는 S3 저장을 위해 AWS Firehose에 로깅됩니다.

## 🏗️ 아키텍처 개선사항

이 서비스는 특정 도메인 레이어에 속하지 않는 범용 서비스로 설계되었습니다:
- **DataSource 활용**: `@InjectRepository` 대신 `DataSource`를 통해 User/Parent repository에 접근
- **도메인 독립성**: 특정 도메인에 종속되지 않는 범용적인 알림 서비스
- **관심사 분리**: 알림 전송 로직과 도메인 로직의 명확한 분리

## 📦 설치 및 모듈 Import

```typescript
import { NotificationModule } from 'src/services/notification/notification.module';

@Module({
  imports: [NotificationModule],
  // ...
})
export class YourModule {}
```

**모듈 구성**: NotificationModule은 User/Parent 엔티티에 대한 직접적인 TypeORM 모듈 의존성 없이 DataSource를 통해 동작합니다.

## 📚 사용법

### NotificationService.send() 사용법

#### FCM/SMS 혼합 개별 메시지 발송
```typescript
async send() {
  await this.notificationService.send(
  {
    "schoolId": 1,
    "type": "DISPATCH_NEWS",
    "role": "PARENT",
    "messages": [
        {
            "id": 1,
            "token": "c0pLM7WOQzahcC8609mxeN:APA91bEAsrk31P8iPFM7grcP5SHKbZcF6VGJrveCw4jbSt-KbLEnTBABw4aqNQfeupqFFdKI22r9JsuhoVY5t-OnWdDYnwZ5PLeAZiQje01pU-eDn-dO2J8",
            "phone": "01094867415",
            "body": "방송이 시작했습니다. https://youtube.com",
            "role": "PARENT",
            "page": "news",
            "args": "newsId=1&parentId=1"
        },
        {
            "id": 1,
            "token": null,
            "phone": "01094867415",
            "body": "드라마가 시작했습니다. https://netflix.com",
            "role": "PARENT",
            "page": "news",
            "args": "newsId=2&parentId=1"
        }
      ]
    }
  );
}
```

## 📋 파라미터 상세 설명

### 공통 타입 정의

#### `PartitioningMeta` (S3 파티셔닝 메타데이터)
- `type`: 메시지 타입 (예: 'ping.class', 'letter.notice', 'ping.exit')
- `school`: 학교 ID 문자열 (Firehose 로깅용 필수)
- `role`: 사용자 역할 (`PARENT` 또는 `INSTRUCTOR`)

#### `MessageBody` (메시지 내용)
- `title`: 알림 제목 (선택사항)
- `body`: 알림 메시지 (필수)

#### `FcmData` (FCM 라우팅 데이터)
- `role`: 사용자 역할 (`PARENT` 또는 `INSTRUCTOR`)
- `target`: FCM 데이터에 포함할 대상 페이지/섹션 (선택사항)
- `targetArgs`: FCM 데이터에 포함할 대상 ID (선택사항)

### Mixed 메서드 파라미터

#### `MultiMixedMessages`
```typescript
{
  // 혼합 메시지 배열 (MixedPair)
  messages: Array<{
    id: number;         // 사용자 ID
    token?: string | null;  // FCM 토큰 (있으면 FCM 우선)
    phone?: string;     // 전화번호 (token 없으면 SMS)
    title?: string;     // 개별 제목
    body: string;       // 개별 내용
    role: string;       // 개별 역할
    page?: string;    // FCM 라우팅 (FCM인 경우만)
    args?: string; // FCM 라우팅 파라미터
  }>;
  // PartitioningMeta (공통)
  type: string;
  school: string;
  role: string;
}
```

## 🎯 FCM 데이터 구조

푸시 알림 클릭 시 앱 내비게이션을 위한 데이터:
```json
{
  "role": "PARENT",
  "page": "announcements", // 이동할 페이지
  "args": "123"            // 페이지에서 사용할 파라미터
}
```

## 📱 알림 라우팅 규칙

### FCM 전용 메서드
- **대상**: 유효한 `token`을 가진 사용자만
- **실패**: 토큰이 없거나 무효한 경우 failure로 집계
- **장점**: 정확한 푸시 알림, 앱 내비게이션 지원

### SMS 전용 메서드  
- **대상**: 유효한 `phone` 번호를 가진 사용자만
- **실패**: 전화번호가 없거나 학교 SMS 설정이 비활성화된 경우
- **형식**: `[제목] 내용` (제목이 있는 경우)
- **제한**: 학교의 SMS 발신 설정 및 번호 필요

### Mixed 메서드 (지능적 라우팅)
1. **FCM 우선**: `token`이 유효한 경우 FCM으로 발송
2. **SMS 대체**: `token`이 없지만 `phone`이 있는 경우 SMS로 발송  
3. **발송 불가**: 둘 다 없는 경우 failure로 집계

## ✨ 주요 기능

- ✅ **7가지 전문화된 메서드**: FCM(3) + SMS(3) + Mixed(1)로 명확한 책임 분리
- ✅ **토큰/전화번호 기반 처리**: ID 배열 대신 실제 연락처 정보로 직접 처리
- ✅ **효율적인 배치 처리**: FCM multicast와 SMS bulk 발송으로 성능 최적화
- ✅ **개별 메시지 지원**: 각 사용자별 다른 내용의 메시지 발송 가능
- ✅ **지능적 혼합 라우팅**: Mixed 메서드에서 FCM/SMS 자동 선택
- ✅ **포괄적 로깅**: FCM과 SMS 모두의 성공/실패 상세 추적
- ✅ **Firehose 통합**: PARENT 역할 메트릭을 S3에 파티셔닝하여 저장
- ✅ **에러 복원력**: 개별 실패가 전체 프로세스를 중단시키지 않음
- ✅ **논블로킹 로깅**: Firehose 실패가 알림 발송을 중단시키지 않음
- ✅ **도메인 독립성**: DataSource 활용으로 특정 도메인에 종속되지 않음

## 📊 로깅 및 모니터링

### 콘솔 로깅
```
// FCM 전용 메서드
sendFcmMessage notification summary - FCM: 1/1, SMS: 0/0
broadcastFcmMessageToParents notification summary - FCM: 8/10, SMS: 0/0
sendFcmMessagesToParents notification summary - FCM: 5/7, SMS: 0/0

// SMS 전용 메서드  
sendSmsMessage notification summary - FCM: 0/0, SMS: 1/1
broadcastSmsMessage notification summary - FCM: 0/0, SMS: 12/15
sendSmsMessages notification summary - FCM: 0/0, SMS: 9/10

// Mixed 메서드
sendMixedMessages notification summary - FCM: 6/8, SMS: 3/5
```

의미:
- `FCM: 6/8` = 8번 FCM 시도 중 6번 성공
- `SMS: 3/5` = 5번 SMS 시도 중 3번 성공

### Firehose 로그 형식

> ⚠️ **주의**: PARENT 역할의 알림만 Firehose에 로깅됩니다.

#### FCM 전용 메서드 로그
```json
{
  "type": "ping.class",
  "school": 1,
  "school_name": "삼척초등학교",
  "title": "FCM 동일대량 10개",
  "body": "모든 부모님께 드리는 중요한 공지사항입니다",
  "user_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "role": "PARENT",
  "fcm_success_count": 8,
  "fcm_failure_count": 2,
  "sms_success_count": 0,
  "sms_failure_count": 0,
  "year": "2024",
  "month": "03", 
  "day": "15",
  "hour": "14",
  "timestamp": "2024-03-15T14:30:00.000+09:00",
  "total_users": 10,
  "total_success": 8,
  "total_failure": 2,
  "success_rate": 80
}
```

#### SMS 전용 메서드 로그
```json
{
  "type": "letter.meal",
  "school": 1,
  "school_name": "삼척초등학교", 
  "title": "SMS 동일대량 15개",
  "body": "[급식 안내] 내일 급식 메뉴는 김치찌개입니다",
  "user_ids": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
  "role": "PARENT",
  "fcm_success_count": 0,
  "fcm_failure_count": 0,
  "sms_success_count": 12,
  "sms_failure_count": 3,
  "total_users": 15,
  "total_success": 12,
  "total_failure": 3,
  "success_rate": 80
}
```

#### Mixed 메서드 로그
```json
{
  "type": "ping.emergency",
  "school": 1,
  "school_name": "삼척초등학교",
  "title": "Mixed 개별대량 20개 (FCM: 12, SMS: 8)",
  "body": "긴급상황이 발생했습니다",
  "user_ids": [1, 2, 3, ...18, 19, 20],
  "role": "PARENT", 
  "fcm_success_count": 10,
  "fcm_failure_count": 2,
  "sms_success_count": 6,
  "sms_failure_count": 2,
  "total_users": 20,
  "total_success": 16,
  "total_failure": 4,
  "success_rate": 80
}
```

## 🎬 사용 시나리오

### 시나리오 1: 전체 급식 공지 (FCM)
```typescript
// FCM 토큰이 있는 모든 부모에게 동일한 급식 공지
await notificationService.broadcastFcmMessage({
  tokenPairs: [
    { id: 1, token: "token_parent_1" },
    { id: 2, token: "token_parent_2" },
    { id: 3, token: "token_parent_3" },
    { id: 4, token: "token_parent_4" }
  ],
  title: "급식 공지",
  body: "내일은 김치찌개와 불고기가 나옵니다",
  role: "PARENT",
  target: "meal-schedule",
  targetArgs: "meal-2024-03-16",
  type: "letter.notice",
  school: "1",
  role: "PARENT"
});
```

### 시나리오 2: 개별 성적 통지 (FCM)
```typescript
// 각 부모에게 자녀별 개별 성적 FCM 푸시
await notificationService.sendFcmMessages({
  messages: [
    {
      id: 1,
      token: "token_parent_1",
      title: "김철수 어머님께",
      body: "철수의 중간고사 성적: 수학 95점, 국어 88점, 영어 92점",
      role: "PARENT",
      target: "grade-report",
      targetArgs: "student-123-midterm"
    },
    {
      id: 2,
      token: "token_parent_2", 
      title: "이영희 아버님께",
      body: "영희의 중간고사 성적: 수학 100점, 국어 96점, 영어 94점",
      role: "PARENT",
      target: "grade-report", 
      targetArgs: "student-124-midterm"
    }
  ],
  type: "letter.report",
  school: "1",
  role: "PARENT"
});
```

### 시나리오 3: 긴급 연락 (SMS)
```typescript
// 앱을 사용하지 않는 부모들에게 SMS로 긴급 연락
await notificationService.broadcastSmsMessage({
  phonePairs: [
    { id: 5, phone: "01011111111" },
    { id: 6, phone: "01022222222" },
    { id: 7, phone: "01033333333" }
  ],
  title: "긴급 연락",
  body: "학교에서 긴급한 상황이 발생했습니다. 학교로 연락주세요.",
  type: "ping.emergency",
  school: "1", 
  role: "PARENT"
});
```

### 시나리오 4: 하이브리드 알림 (Mixed)
```typescript
// FCM과 SMS를 모두 활용한 최대 도달률 확보
await notificationService.sendMixedMessages({
  messages: [
    {
      // FCM으로 발송 (token 우선)
      id: 1,
      token: "valid_token_1",
      phone: "01011111111",
      title: "김선생님께",
      body: "오늘 교실 점검을 부탁드립니다",
      role: "INSTRUCTOR",
      target: "task-detail",
      targetArgs: "task-classroom-101"
    },
    {
      // SMS로 발송 (token 없음)
      id: 2,
      token: null,
      phone: "01022222222", 
      title: "박선생님께",
      body: "오늘 체육관 정리를 부탁드립니다",
      role: "INSTRUCTOR", 
      target: "task-detail",
      targetArgs: "task-gym-cleanup"
    },
    {
      // 발송 불가 (둘 다 없음) 
      id: 3,
      token: null,
      phone: null,
      body: "연락처 정보가 없는 사용자",
      role: "INSTRUCTOR"
    }
  ],
  type: "ping.task",
  school: "1",
  role: "INSTRUCTOR"
});
```

### 시나리오 5: 개별 귀가 알림 (SMS)
```typescript
// 각 부모에게 자녀별 개별 귀가 SMS
await notificationService.sendSmsMessages({
  messages: [
    {
      id: 10,
      phone: "01011111111",
      title: "철수 어머님께",
      body: "철수 학생이 오후 3시 30분에 안전하게 귀가했습니다"
    },
    {
      id: 11,
      phone: "01022222222",
      title: "영희 아버님께", 
      body: "영희 학생이 오후 3시 45분에 안전하게 귀가했습니다"
    },
    {
      id: 12,
      phone: "01033333333",
      title: "민수 어머님께",
      body: "민수 학생이 오후 4시에 안전하게 귀가했습니다"
    }
  ],
  type: "ping.exit",
  school: "1",
  role: "PARENT"
});
```

## 🔧 TypeScript 타입 정의

```typescript
// 기본 타입들
export type PartitioningMeta = {
  type: string;    // 메시지 타입 (ping.class, letter.notice 등)
  school: string;  // 학교 ID 문자열  
  role: string;    // PARENT 또는 INSTRUCTOR
};

export type MessageBody = {
  title?: string;  // 선택적 제목
  body: string;    // 필수 메시지 내용
};

export type FcmData = {
  role: string;        // PARENT 또는 INSTRUCTOR
  target?: string;     // 클라이언트 라우팅용 페이지
  targetArgs?: string; // 클라이언트 라우팅용 파라미터
};

export type TokenPair = {
  id: number;    // 사용자 ID (로깅용)
  token: string; // FCM 토큰
};

export type PhonePair = {
  id: number;   // 사용자 ID (로깅용)
  phone: string; // 전화번호
};

export type MixedPair = {
  id: number;            // 사용자 ID (로깅용)
  token?: string | null; // FCM 토큰 (있으면 FCM 우선)
  phone?: string;        // 전화번호 (token 없으면 SMS)
};

// 주요 메서드 타입들
export type SingleFcmMessage = TokenPair & MessageBody & FcmData & PartitioningMeta;
export type BroadcastFcmMessage = { tokenPairs: TokenPair[] } & MessageBody & FcmData & PartitioningMeta;
export type MultiFcmMessages = { messages: (TokenPair & MessageBody & FcmData)[] } & PartitioningMeta;

export type SingleSmsMessage = PhonePair & MessageBody & PartitioningMeta;
export type BroadcastSmsMessage = { phonePairs: PhonePair[] } & MessageBody & PartitioningMeta;
export type MultiSmsMessages = { messages: (PhonePair & MessageBody)[] } & PartitioningMeta;

export type MultiMixedMessages = { messages: (MixedPair & MessageBody & FcmData)[] } & PartitioningMeta;

// 결과 타입
export type NotificationResult = {
  success: boolean;
  error?: Error;
  retryable?: boolean; // 재시도 가능한 에러인지 표시
};
```

## 🎯 메서드 선택 가이드

| 상황 | 추천 메서드 | 이유 |
|------|-------------|------|
| **앱 사용자 전체 공지** | `broadcastFcmMessage` | FCM으로 즉시 푸시, 앱 라우팅 지원 |
| **비앱 사용자 전체 공지** | `broadcastSmsMessage` | SMS로 확실한 전달, 제목 표시 |
| **혼합 전체 공지** | `sendMixedMessages` (동일 메시지로) | 최대 도달률, 지능적 라우팅 |
| **개별 성적 통지** | `sendFcmMessages` | 각 학생별 다른 성적, 보안성 우수 |
| **개별 귀가 알림** | `sendSmsMessages` | 즉시 확인 가능, 폰으로 직접 수신 |
| **긴급 상황 알림** | `sendMixedMessages` | FCM+SMS로 최대 도달률 확보 |
| **교사 업무 배정** | `sendFcmMessages` | 앱 내에서 업무 상세 확인 가능 |
| **단일 사용자 알림** | `sendFcmMessage` 또는 `sendSmsMessage` | 대상에 따라 선택 |

### 📋 의사결정 플로우차트

```
알림 보내기
    ↓
여러 명에게? 
    ↓ YES                          ↓ NO
동일한 메시지?              sendFcmMessage 또는 sendSmsMessage
    ↓ YES            ↓ NO
broadcastXXX       sendXXXMessages
    ↓                     ↓
대상이 앱 사용자?    각자 다른 내용?
↓ YES    ↓ NO         ↓ YES    ↓ NO  
FCM      SMS         Mixed     FCM/SMS 선택
```

### ⚡ 성능 고려사항

- **FCM**: 대량 발송시 자동 배치 처리 (최대 500개씩)
- **SMS**: 학교별 발신 설정 및 요금 고려 필요
- **Mixed**: FCM 우선 처리 후 SMS 대체, 순차 처리

이제 NotificationService는 **책임 분리 원칙**에 따라 명확하고 효율적인 알림 시스템을 제공합니다! 🚀