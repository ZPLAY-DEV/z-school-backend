# NotificationService

NotificationService는 **지능적 하이브리드 알림 시스템**으로, FCM과 SMS를 자동으로 선택하여 최대 도달률을 확보합니다.

## 📨 알림 전송 메서드

### `send()` - 하이브리드 메시지 발송
FCM/SMS를 지능적으로 선택하여 각 사용자에게 개별 메시지를 발송합니다.

## 🚀 지능적 라우팅 시스템

### 자동 전송 방식 선택
1. **FCM 우선**: `token`이 유효한 경우 FCM으로 발송
2. **SMS 대체**: `token`이 없지만 `phone`이 있는 경우 SMS로 발송  
3. **발송 불가**: 둘 다 없는 경우 failure로 집계

### 학교별 SMS 설정 고려
- **SMS 비활성화**: 학교가 `messageType`을 `FCM`으로 설정한 경우 SMS 발송 불가
- **발신번호 미설정**: 학교의 `phone`이 설정되지 않은 경우 SMS 발송 불가

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

#### FCM/SMS 혼합 개별 메시지 발송
```typescript
async sendNotifications() {
  const result = await this.notificationService.send({
    type: "DISPATCH_NEWS",
    schoolId: 1,
    role: "PARENT",
    messages: [
      {
        id: 1,
        token: "c0pLM7WOQzahcC8609mxeN:APA91bEAsrk31P8iPFM7grcP5SHKbZcF6VGJrveCw4jbSt-KbLEnTBABw4aqNQfeupqFFdKI22r9JsuhoVY5t-OnWdDYnwZ5PLeAZiQje01pU-eDn-dO2J8",
        phone: "01094867415",
        title: "방송 알림",
        body: "방송이 시작했습니다. https://youtube.com",
        role: "PARENT",
        page: "news",
        args: "newsId=1&parentId=1"
      },
      {
        id: 2,
        token: null, // FCM 토큰이 없어서 SMS로 발송됨
        phone: "01094867415",
        title: "드라마 알림",
        body: "드라마가 시작했습니다. https://netflix.com",
        role: "PARENT",
        page: "news",
        args: "newsId=2&parentId=1"
      }
    ]
  });
  
  // 결과 처리
  result.forEach((res, index) => {
    if (res.success) {
      console.log(`사용자 ${res.id} 알림 발송 성공`);
    } else {
      console.error(`사용자 ${res.id} 알림 발송 실패:`, res.error);
    }
  });
}
```

## 📋 파라미터 상세 설명

### `MultiMixedMessages` 타입
```typescript
{
  // 공통 메타데이터
  type: NotificationType;    // PING_SCHOOL, PING_CLASS, PING_OTHER, DISPATCH_REGISTER, DISPATCH_NEWS, DISPATCH_SURVEY
  schoolId: number;          // 학교 ID
  role: string;              // "PARENT" 또는 "INSTRUCTOR"
  
  // 개별 메시지 배열
  messages: Array<{
    id: number;              // 사용자 ID (로깅용)
    token?: string | null;   // FCM 토큰 (있으면 FCM 우선)
    phone?: string;          // 전화번호 (token 없으면 SMS)
    title?: string;          // 개별 제목
    body: string;            // 개별 내용 (필수)
    role: string;            // 개별 역할
    page?: string;           // FCM 라우팅 페이지 (FCM인 경우만)
    args?: string;           // FCM 라우팅 파라미터 (FCM인 경우만)
  }>;
}
```

### 알림 타입 (NotificationType)
- `PING_SCHOOL`: 학교 전체 알림
- `PING_CLASS`: 반별 알림  
- `PING_OTHER`: 기타 알림
- `DISP_REGISTER`: 가입 관련 알림
- `DISP_NEWS`: 소식/공지 알림
- `DISP_SURVEY`: 설문 관련 알림

## 🎯 FCM 데이터 구조

푸시 알림 클릭 시 앱 내비게이션을 위한 데이터:
```json
{
  "role": "PARENT",
  "page": "announcements",   // 이동할 페이지
  "args": "123"             // 페이지에서 사용할 파라미터
}
```

## 📱 처리 플로우

### 1. 메시지 분류
- **FCM 메시지**: `token`이 있는 메시지들
- **SMS 메시지**: `token`이 없고 `phone`이 있는 메시지들

### 2. FCM 발송 (토큰이 있는 경우)
- FcmService를 통해 배치 발송
- 무효한 토큰은 자동으로 DB에서 null 처리
- 성공/실패 개별 추적

### 3. SMS 발송 (토큰이 없는 경우)
- 학교 SMS 설정 확인 (`messageType`, `phone`)
- AligoService를 통해 배치 발송
- 학교 발신번호로 SMS 전송

### 4. 결과 반환
- 각 사용자별 성공/실패 결과
- 에러 정보 metrics 포함

## ✨ 주요 기능

- ✅ **지능적 하이브리드 라우팅**: FCM/SMS 자동 선택으로 최대 도달률 확보
- ✅ **개별 메시지 지원**: 각 사용자별 다른 내용의 메시지 발송 가능
- ✅ **효율적인 배치 처리**: FCM multicast와 SMS bulk 발송으로 성능 최적화
- ✅ **자동 토큰 관리**: 무효한 FCM 토큰을 자동으로 정리
- ✅ **학교별 설정 준수**: 각 학교의 SMS 발송 정책을 자동으로 적용
- ✅ **포괄적 로깅**: FCM과 SMS 모두의 성공/실패 상세 추적
- ✅ **Firehose 통합**: PARENT 역할 메트릭을 S3에 파티셔닝하여 저장
- ✅ **에러 복원력**: 개별 실패가 전체 프로세스를 중단시키지 않음
- ✅ **논블로킹 로깅**: Firehose 실패가 알림 발송을 중단시키지 않음
- ✅ **도메인 독립성**: DataSource 활용으로 특정 도메인에 종속되지 않음

## 📊 로깅 및 모니터링

### 콘솔 로깅
서비스는 FCM과 SMS의 성공/실패를 별도로 추적하고 로깅합니다:

```
🖐️ 3 sms messages sent from 01012345678
🔥 smsResult: {"results":[...], "successCount":2, "failureCount":1}
A DISPATCH_NEWS log sent to Firehose
```

### Firehose 로그 형식

> ⚠️ **주의**: PARENT 역할의 알림 또는 SMS가 포함된 알림만 Firehose에 로깅됩니다.

```json
{
  "type": "DISPATCH_NEWS",
  "school": "1",
  "school_name": "삼척초등학교",
  "title": "방송 알림 외 1건",
  "body": "방송이 시작했습니다. https://youtube.com 외 1건",
  "ids": [1, 2],
  "role": "PARENT",
  "year": "2024",
  "month": "03", 
  "day": "15",
  "hour": "14",
  "total": 2,
  "success": 2,
  "failure": 0,
  "fcm_success": 1,
  "fcm_failure": 0,
  "sms_success": 1,
  "sms_failure": 0,
  "timestamp": "2024-03-15 14:30:00"
}
```

## 🎬 사용 시나리오

### 시나리오 1: 전체 급식 공지
```typescript
// 모든 부모에게 동일한 급식 공지 (FCM 우선, SMS 대체)
await notificationService.send({
  type: "DISP_NEWS",
  schoolId: 1,
  role: "PARENT",
  messages: parents.map(parent => ({
    id: parent.id,
    token: parent.pushToken,
    phone: parent.phone,
    title: "급식 공지",
    body: "내일은 김치찌개와 불고기가 나옵니다",
    role: "PARENT",
    page: "meal-schedule",
    args: "meal-2024-03-16"
  }))
});
```

### 시나리오 2: 개별 성적 통지
```typescript
// 각 부모에게 자녀별 개별 성적 알림
await notificationService.send({
  type: "DISP_NEWS",
  schoolId: 1,
  role: "PARENT",
  messages: [
    {
      id: 1,
      token: parent1.pushToken,
      phone: parent1.phone,
      title: "김철수 어머님께",
      body: "철수의 중간고사 성적: 수학 95점, 국어 88점, 영어 92점",
      role: "PARENT",
      page: "grade-report",
      args: "student-123-midterm"
    },
    {
      id: 2,
      token: parent2.pushToken,
      phone: parent2.phone,
      title: "이영희 아버님께",
      body: "영희의 중간고사 성적: 수학 100점, 국어 96점, 영어 94점",
      role: "PARENT",
      page: "grade-report",
      args: "student-124-midterm"
    }
  ]
});
```

### 시나리오 3: 긴급 연락
```typescript
// 긴급상황 - 최대 도달률을 위해 FCM/SMS 모두 활용
await notificationService.send({
  type: "PING_SCHOOL",
  schoolId: 1,
  role: "PARENT",
  messages: allParents.map(parent => ({
    id: parent.id,
    token: parent.pushToken,
    phone: parent.phone,
    title: "긴급 연락",
    body: "학교에서 긴급한 상황이 발생했습니다. 학교로 연락주세요.",
    role: "PARENT",
    page: "emergency",
    args: "alert-001"
  }))
});
```

### 시나리오 4: 개별 귀가 알림
```typescript
// 각 부모에게 자녀별 개별 귀가 SMS (토큰 없이 SMS만)
await notificationService.send({
  type: "PING_OTHER",
  schoolId: 1,
  role: "PARENT",
  messages: [
    {
      id: 10,
      token: null, // SMS로 강제 발송
      phone: "01011111111",
      title: "철수 어머님께",
      body: "철수 학생이 오후 3시 30분에 안전하게 귀가했습니다",
      role: "PARENT"
    },
    {
      id: 11,
      token: null,
      phone: "01022222222",
      title: "영희 아버님께",
      body: "영희 학생이 오후 3시 45분에 안전하게 귀가했습니다",
      role: "PARENT"
    }
  ]
});
```

## 🔧 TypeScript 타입 정의

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
  page?: string;       // 클라이언트 라우팅용 페이지
  args?: string;       // 클라이언트 라우팅용 파라미터
};

export type MixedPair = {
  id: number;              // 사용자 ID (로깅용)
  token?: string | null;   // FCM 토큰 (있으면 FCM 우선)
  phone?: string;          // 전화번호 (token 없으면 SMS)
};

// 주요 메서드 타입
export type MultiMixedMessages = {
  messages: (MixedPair & MessageBody & FcmData)[];
} & PartitioningMeta;

// 결과 타입
export type NotificationResult = {
  success: boolean;
  error?: Error;
  id?: number;
};
```

## 🎯 선택 가이드

| 상황 | 사용법 | 장점 |
|------|--------|------|
| **전체 공지 (최대 도달률)** | 모든 사용자에게 `token`과 `phone` 모두 제공 | FCM/SMS 자동 선택으로 최대 도달률 |
| **앱 사용자만 대상** | `token`만 제공, `phone`은 null | FCM으로만 발송, 앱 라우팅 지원 |
| **비앱 사용자만 대상** | `token`을 null로, `phone`만 제공 | SMS로만 발송, 확실한 전달 |
| **개별 맞춤 메시지** | 각 메시지별 다른 `title`, `body` | 사용자별 개인화된 알림 |
| **긴급 상황** | `token`과 `phone` 모두 제공 | 이중 안전망으로 확실한 전달 |

## ⚡ 성능 및 제한사항

### 성능 최적화
- **FCM**: Firebase의 multicast API 활용으로 효율적인 배치 발송
- **SMS**: Aligo의 bulk API 활용으로 동시 다건 발송
- **병렬 처리**: FCM과 SMS가 동시에 처리되어 빠른 전송

### 제한사항
- **학교 SMS 설정**: `messageType`이 `FCM`이면 SMS 발송 불가
- **발신번호**: 학교의 `phone`이 설정되지 않으면 SMS 발송 불가
- **토큰 관리**: 무효한 FCM 토큰은 자동으로 DB에서 제거
- **Firehose 로깅**: PARENT 역할 알림만 로깅되며, 실패해도 알림 발송은 계속됨

이제 NotificationService는 **지능적 하이브리드 시스템**으로 FCM과 SMS의 장점을 모두 활용하여 최대 도달률을 제공합니다! 🚀
