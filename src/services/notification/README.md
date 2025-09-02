# NotificationService

NotificationService는 **지능적 하이브리드 알림 시스템**으로, FCM과 카카오 알림톡을 자동으로 선택하여 최대 도달률을 확보합니다.

## 📨 알림 전송 메서드

### `send()` - 하이브리드 메시지 발송
FCM/카카오 알림톡을 지능적으로 선택하여 각 사용자에게 개별 메시지를 발송합니다.

## 🚀 지능적 라우팅 시스템

### 자동 전송 방식 선택
1. **FCM 우선**: `token`이 유효한 경우 FCM으로 발송
2. **카카오 알림톡 대체**: `token`이 없지만 `phone`이 있는 경우 카카오 알림톡으로 발송  
3. **발송 불가**: 둘 다 없는 경우 failure로 집계

### 카카오 알림톡 SMS 대체 발송
- **자동 SMS 대체**: 카카오 알림톡 발송 실패 시 자동으로 SMS로 대체 발송
- **SMS 대체 추적**: `smsFailoverCount`로 SMS 대체 발송 건수 모니터링 가능

## 🏗️ 아키텍처 특징

이 서비스는 특정 도메인 레이어에 속하지 않는 범용 서비스로 설계되었습니다:
- **DataSource 활용**: `@InjectRepository` 대신 `DataSource`를 통해 User/School repository에 접근
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

**모듈 구성**: NotificationModule은 User/School 엔티티에 대한 직접적인 TypeORM 모듈 의존성 없이 DataSource를 통해 동작합니다.

## 📚 사용법

### NotificationService.send() 사용법

#### FCM/카카오 알림톡 혼합 개별 메시지 발송
```typescript
async sendNotifications() {
  const result = await this.notificationService.send({
    type: "REGISTRATION",
    schoolId: 1,
    role: "PARENT",
    messages: [
      {
        id: 1,
        token: "c0pLM7WOQzahcC8609mxeN:APA91bEAsrk31P8iPFM7grcP5SHKbZcF6VGJrveCw4jbSt-KbLEnTBABw4aqNQfeupqFFdKI22r9JsuhoVY5t-OnWdDYnwZ5PLeAZiQje01pU-eDn-dO2J8",
        phone: "01094867415",
        template: "NOTIFICATION_TEMPLATE",
        title: "방송 알림",
        body: "방송이 시작했습니다. https://youtube.com",
        role: "PARENT",
        url: "https://youtube.com",
        routes: { page: "news", args: "newsId=1&parentId=1" }
      },
      {
        id: 2,
        token: null, // FCM 토큰이 없어서 카카오 알림톡으로 발송됨
        phone: "01094867415",
        template: "NOTIFICATION_TEMPLATE",
        title: "드라마 알림",
        body: "드라마가 시작했습니다. https://netflix.com",
        role: "PARENT",
        url: "https://netflix.com",
        routes: { page: "news", args: "newsId=2&parentId=1" }
      }
    ]
  });
  
  // ✅ Best Practice: 구조화된 결과 처리
  console.log(`전체 발송: ${result.totalSent}개 성공, ${result.totalFailed}개 실패`);
  
  // FCM 결과 확인
  if (result.channels.fcm) {
    const fcm = result.channels.fcm;
    console.log(`FCM: ${fcm.sent}개 성공, ${fcm.failed}개 실패`);
    if (fcm.invalidTokens.length > 0) {
      console.log(`무효 토큰 ${fcm.invalidTokens.length}개 정리됨`);
    }
  }
  
  // 카카오 알림톡 결과 확인
  if (result.channels.kakao) {
    const kakao = result.channels.kakao;
    console.log(`카카오 알림톡: ${kakao.sent}개 성공, ${kakao.failed}개 실패`);
    if (kakao.smsFailoverCount > 0) {
      console.log(`SMS 대체 발송: ${kakao.smsFailoverCount}개`);
    }
  }
  
  // 에러 처리
  if (result.errors && result.errors.length > 0) {
    console.error('발송 중 에러 발생:', result.errors);
  }
}
```

## 📋 파라미터 상세 설명

### 알림 타입 (NotificationType)
- `REGISTRATION`: 수강신청 알림
- `NEWS`: 공지사항 알림
- `SURVEY`: 설문조사 알림
- `SCHOOL`: 학교 전체 알림
- `CLASS`: 반별 알림  
- `OTHER`: 기타 알림

## 🎯 FCM 데이터 구조

푸시 알림 클릭 시 앱 내비게이션을 위한 데이터:
```json
{
  "role": "PARENT",
  "url": "https://app.schoolhub.co.kr/newsletters",  // 이동할 페이지
  "routes": ""             // JSON stringified object
}
```

## 📱 처리 플로우

### 1. 메시지 분류
- **FCM 메시지**: `token`이 있는 메시지들
- **카카오 알림톡 메시지**: `token`이 없고 `phone`이 있는 메시지들

### 2. FCM 발송 (토큰이 있는 경우)
- FcmService를 통해 배치 발송
- 무효한 토큰은 자동으로 DB에서 null 처리
- 성공/실패 개별 추적

### 3. 카카오 알림톡 발송 (토큰이 없는 경우)
- SensService를 통해 카카오 알림톡 발송
- 발송 실패 시 자동으로 SMS로 대체 발송
- SMS 대체 발송 건수 추적

### 4. 결과 반환
- 통합된 구조화된 결과 반환
- 채널별 상세 정보 및 메트릭 포함

## ✨ 주요 기능

- ✅ **지능적 하이브리드 라우팅**: FCM/카카오 알림톡 자동 선택으로 최대 도달률 확보
- ✅ **개별 메시지 지원**: 각 사용자별 다른 내용의 메시지 발송 가능
- ✅ **효율적인 배치 처리**: FCM multicast와 카카오 알림톡 배치 발송으로 성능 최적화
- ✅ **자동 토큰 관리**: 무효한 FCM 토큰을 자동으로 정리
- ✅ **SMS 대체 발송**: 카카오 알림톡 실패 시 자동 SMS 대체 발송
- ✅ **포괄적 로깅**: FCM과 카카오 알림톡 모두의 성공/실패 상세 추적
- ✅ **에러 복원력**: 개별 실패가 전체 프로세스를 중단시키지 않음
- ✅ **도메인 독립성**: DataSource 활용으로 특정 도메인에 종속되지 않음

## 📊 로깅 및 모니터링

### 콘솔 로깅
서비스는 FCM과 카카오 알림톡의 성공/실패를 별도로 추적하고 로깅합니다:

```
🔥 FCM 발송 완료: 5개 성공, 1개 실패
📱 카카오 알림톡 발송 완료: 3개 성공, 0개 실패
📱 SMS 대체 발송: 1개
```

## 🎬 사용 시나리오

### 시나리오 1: 전체 급식 공지
```typescript
// 모든 부모에게 동일한 급식 공지 (FCM 우선, 카카오 알림톡 대체)
await notificationService.send({
  type: "NEWS",
  schoolId: 1,
  role: "PARENT",
  messages: parents.map(parent => ({
    id: parent.id,
    token: parent.pushToken,
    phone: parent.phone,
    template: "MEAL_NOTIFICATION",
    title: "급식 공지",
    body: "내일은 김치찌개와 불고기가 나옵니다",
    role: "PARENT",
    url: "https://app.schoolhub.co.kr/meal-schedule",
    routes: { page: "meal-schedule", args: "meal-2024-03-16" }
  }))
});
```

### 시나리오 2: 개별 성적 통지
```typescript
// 각 부모에게 자녀별 개별 성적 알림
await notificationService.send({
  type: "REGISTRATION",
  schoolId: 1,
  role: "PARENT",
  messages: [
    {
      id: 1,
      token: parent1.pushToken,
      phone: parent1.phone,
      template: "GRADE_NOTIFICATION",
      title: "김철수 어머님께",
      body: "철수의 중간고사 성적: 수학 95점, 국어 88점, 영어 92점",
      role: "PARENT",
      url: "https://app.schoolhub.co.kr/grade-report",
      routes: { page: "grade-report", args: "student-123-midterm" }
    },
    {
      id: 2,
      token: parent2.pushToken,
      phone: parent2.phone,
      template: "GRADE_NOTIFICATION",
      title: "이영희 아버님께",
      body: "영희의 중간고사 성적: 수학 100점, 국어 96점, 영어 94점",
      role: "PARENT",
      url: "https://app.schoolhub.co.kr/grade-report",
      routes: { page: "grade-report", args: "student-124-midterm" }
    }
  ]
});
```

### 시나리오 3: 긴급 연락
```typescript
// 긴급상황 - 최대 도달률을 위해 FCM/카카오 알림톡 모두 활용
await notificationService.send({
  type: "SCHOOL",
  schoolId: 1,
  role: "PARENT",
  messages: allParents.map(parent => ({
    id: parent.id,
    token: parent.pushToken,
    phone: parent.phone,
    template: "EMERGENCY_NOTIFICATION",
    title: "긴급 연락",
    body: "학교에서 긴급한 상황이 발생했습니다. 학교로 연락주세요.",
    role: "PARENT",
    url: "https://app.schoolhub.co.kr/emergency",
    routes: { page: "emergency", args: "alert-001" }
  }))
});
```

### 시나리오 4: 개별 귀가 알림
```typescript
// 각 부모에게 자녀별 개별 귀가 알림 (토큰 없이 카카오 알림톡만)
await notificationService.send({
  type: "CLASS",
  schoolId: 1,
  role: "PARENT",
  messages: [
    {
      id: 10,
      token: null, // 카카오 알림톡으로 강제 발송
      phone: "01011111111",
      template: "DEPARTURE_NOTIFICATION",
      title: "철수 어머님께",
      body: "철수 학생이 오후 3시 30분에 안전하게 귀가했습니다",
      role: "PARENT"
    },
    {
      id: 11,
      token: null,
      phone: "01022222222",
      template: "DEPARTURE_NOTIFICATION",
      title: "영희 아버님께",
      body: "영희 학생이 오후 3시 45분에 안전하게 귀가했습니다",
      role: "PARENT"
    }
  ]
});
```

## 🔧 TypeScript 타입 정의

### 📤 요청 타입
```typescript
// 기본 타입들
export type PartitioningMeta = {
  type: NotificationType;  // 알림 타입
  schoolId: number;        // 학교 ID
  role: string;            // PARENT 또는 INSTRUCTOR
};

export type MessageBody = {
  title?: string;  // 선택적 제목
  body: string;    // 필수 메시지 내용
};

export type FcmData = {
  role: string;        // PARENT 또는 INSTRUCTOR
  url?: string;        // 클릭 시 이동할 URL
  routes?: Record<string, string>; // 라우팅 정보
};

export type NotificationCoreData = {
  id: number;              // 학부모 ID (로깅용)
  token: string | null;    // FCM 토큰 (있으면 FCM 우선)
  phone: string;           // 전화번호 (token 없으면 카카오 알림톡)
  template: string;        // 카카오 알림톡 템플릿 코드
  title?: string;          // 개별 제목
  body: string;            // 개별 내용 (필수)
  role: string;            // 개별 역할
  url?: string;            // 클릭 시 이동할 URL
  routes?: Record<string, string>; // 라우팅 정보
};

// 주요 메서드 타입
export type NotificationFullData = PartitioningMeta & {
  messages: NotificationCoreData[];
};
```

### 📥 응답 타입 (새로운 구조)
```typescript
// 통합된 알림 발송 결과
export type NotificationSendResult = {
  success: boolean;           // 전체 성공 여부
  totalSent: number;          // 전체 발송 성공 수
  totalFailed: number;        // 전체 발송 실패 수
  channels: {
    fcm?: FcmChannelResult;   // FCM 결과 (선택적)
    kakao?: KakaoChannelResult // 카카오 결과 (선택적)
  };
  errors?: Error[];           // 에러 목록
};

// FCM 채널별 결과
export type FcmChannelResult = {
  success: boolean;           // FCM 채널 성공 여부
  sent: number;               // FCM 발송 성공 수
  failed: number;             // FCM 발송 실패 수
  invalidTokens: string[];    // 무효한 토큰 목록
  results: NotificationResult[]; // 개별 결과 배열
};

// 카카오 채널별 결과
export type KakaoChannelResult = {
  success: boolean;           // 카카오 채널 성공 여부
  sent: number;               // 카카오 발송 성공 수
  failed: number;             // 카카오 발송 실패 수
  smsFailoverCount: number;   // SMS 대체 발송 수
  requestId?: string;         // SENS 요청 ID
  statusCode?: string;        // SENS 상태 코드
  statusName?: string;        // SENS 상태명
  messages?: SensReceivedMessage[]; // 개별 메시지 결과
  error?: Error;              // 에러 정보
};

// 개별 알림 결과
export type NotificationResult = {
  success: boolean;
  messageId?: string;
  error?: Error;
  id?: number;
};
```

## 🎯 Best Practice 가이드

### ✅ 올바른 사용법

#### 1. 결과 처리 패턴
```typescript
const result = await this.notificationService.send(data);

// ✅ 전체 결과 확인
if (!result.success) {
  this.logger.error(`알림 발송 실패: ${result.totalFailed}개 실패`);
  return;
}

// ✅ 채널별 상세 확인
if (result.channels.fcm?.failed > 0) {
  this.logger.warn(`FCM ${result.channels.fcm.failed}개 실패`);
}

if (result.channels.kakao?.smsFailoverCount > 0) {
  this.logger.info(`SMS 대체 발송: ${result.channels.kakao.smsFailoverCount}개`);
}
```

#### 2. 에러 처리 패턴
```typescript
try {
  const result = await this.notificationService.send(data);
  
  // ✅ 성공/실패 로깅
  this.logger.log(`알림 발송 완료: ${result.totalSent}개 성공, ${result.totalFailed}개 실패`);
  
  // ✅ SMS 대체 발송 모니터링
  if (result.channels.kakao?.smsFailoverCount > 0) {
    // SMS 대체 발송이 많으면 FCM 토큰 관리 필요
    this.logger.warn('SMS 대체 발송이 많습니다. FCM 토큰 상태를 확인하세요.');
  }
  
} catch (error) {
  this.logger.error('알림 발송 중 예외 발생:', error);
}
```

#### 3. 모니터링 패턴
```typescript
const result = await this.notificationService.send(data);

// ✅ 메트릭 수집
const metrics = {
  totalSent: result.totalSent,
  totalFailed: result.totalFailed,
  fcmSuccess: result.channels.fcm?.sent || 0,
  fcmFailed: result.channels.fcm?.failed || 0,
  kakaoSuccess: result.channels.kakao?.sent || 0,
  kakaoFailed: result.channels.kakao?.failed || 0,
  smsFailover: result.channels.kakao?.smsFailoverCount || 0,
};

// 메트릭 저장 또는 모니터링 시스템 전송
await this.saveMetrics(metrics);
```

### ❌ 피해야 할 패턴

```typescript
// ❌ 결과를 무시하는 경우
await this.notificationService.send(data); // 결과 확인 안함

// ❌ 에러만 확인하는 경우
const result = await this.notificationService.send(data);
if (result.errors) {
  // 전체 실패만 확인하고 부분 실패는 무시
}

// ❌ 채널별 결과를 구분하지 않는 경우
const result = await this.notificationService.send(data);
console.log(result.totalSent); // FCM과 카카오를 구분하지 않음
```

## 🎯 선택 가이드

| 상황 | 사용법 | 장점 |
|------|--------|------|
| **전체 공지 (최대 도달률)** | 모든 사용자에게 `token`과 `phone` 모두 제공 | FCM/카카오 알림톡 자동 선택으로 최대 도달률 |
| **앱 사용자만 대상** | `token`만 제공, `phone`은 null | FCM으로만 발송, 앱 라우팅 지원 |
| **비앱 사용자만 대상** | `token`을 null로, `phone`만 제공 | 카카오 알림톡으로만 발송, 확실한 전달 |
| **개별 맞춤 메시지** | 각 메시지별 다른 `title`, `body` | 사용자별 개인화된 알림 |
| **긴급 상황** | `token`과 `phone` 모두 제공 | 이중 안전망으로 확실한 전달 |

## ⚡ 성능 및 제한사항

### 성능 최적화
- **FCM**: Firebase의 multicast API 활용으로 효율적인 배치 발송
- **카카오 알림톡**: SENS API를 통한 배치 발송으로 동시 다건 발송
- **병렬 처리**: FCM과 카카오 알림톡이 동시에 처리되어 빠른 전송

### 제한사항
- **카카오 알림톡 템플릿**: 사전 승인된 템플릿만 사용 가능
- **SMS 대체 발송**: 카카오 알림톡 실패 시에만 SMS로 대체 발송
- **토큰 관리**: 무효한 FCM 토큰은 자동으로 DB에서 제거

이제 NotificationService는 **지능적 하이브리드 시스템**으로 FCM과 카카오 알림톡의 장점을 모두 활용하여 최대 도달률을 제공합니다! 🚀
