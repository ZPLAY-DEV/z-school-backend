# NotificationService

NotificationService는 다양한 방식으로 알림을 전송할 수 있는 4가지 메서드를 제공합니다:

## 📨 알림 전송 메서드들

### 1. `sendBulkNotificationToParents()` - 부모 일괄 알림
여러 부모에게 **동일한 메시지**를 발송합니다.

### 2. `sendPersonalizedNotificationToParents()` - 부모 개별 알림  
각 부모에게 **개별적으로 다른 메시지**를 발송합니다.

### 3. `sendBulkNotificationToUsers()` - 사용자 일괄 알림
여러 사용자에게 **동일한 메시지**를 발송합니다.

### 4. `sendPersonalizedNotificationToUsers()` - 사용자 개별 알림
각 사용자에게 **개별적으로 다른 메시지**를 발송합니다.

## 🚀 스마트 알림 시스템

모든 메서드는 지능적으로 최적의 전송 방법을 선택합니다:
- **FCM (Firebase Cloud Messaging)**: 푸시 토큰이 있는 사용자용
- **SMS (Aligo 서비스)**: 푸시 토큰은 없지만 전화번호가 있는 사용자용

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

### 1. Bulk 알림 (일괄 전송) - 동일한 메시지

#### 부모들에게 일괄 알림
```typescript
import { NotificationService } from 'src/services/notification/notification.service';

@Injectable()
export class YourService {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async sendBulkToParents() {
    await this.notificationService.sendBulkNotificationToParents({
      messageType: 'ping.class',
      ids: [1, 2, 3, 4, 5],           // 알림을 보낼 부모 ID 배열
      schoolId: 1,                             // 로깅용 학교 ID
      schoolName: "삼척초등학교",                 // 로깅용 학교명
      title: "중요 공지",                        // 알림 제목 (선택사항)
      body: "모든 부모님께 전달하는 중요한 메시지입니다", // 알림 내용 (필수)
      role: "PARENT",                          // FCM 데이터용 사용자 역할
      target: "announcements",                 // FCM 데이터용 대상 페이지/섹션
      targetId: "123",                         // FCM 데이터용 대상 ID
      senderPhone: "01012345678",              // SMS 발신번호
    });
  }
}
```

#### 사용자들에게 일괄 알림
```typescript
async sendBulkToUsers() {
  await this.notificationService.sendBulkNotificationToUsers({
    messageType: 'letter.notice',
    ids: [1, 2, 3, 4, 5],             // 알림을 보낼 사용자 ID 배열
    schoolId: 1,
    schoolName: "삼척초등학교",
    title: "시스템 점검 안내",
    body: "오늘 밤 12시부터 2시까지 시스템 점검이 있습니다",
    role: "INSTRUCTOR",
    target: "system-status",
    targetId: "maintenance-001",
    senderPhone: "01012345678",
  });
}
```

### 2. Personalized 알림 (개별 전송) - 각기 다른 메시지

#### 부모들에게 개별 알림
```typescript
async sendPersonalizedToParents() {
  await this.notificationService.sendPersonalizedNotificationToParents({
    messageType: 'letter.report',
    notifications: [
      {
        id: 1,                               // 부모 ID
        title: "김철수 학부모님께",
        body: "김철수 학생 오늘 수학 수업에 지각했습니다.",
        target: "student-detail",
        targetId: "student-123"
      },
      {
        id: 2,                               // 부모 ID
        title: "이영희 학부모님께", 
        body: "이영희 학생 오늘 하교 했습니다.",
        target: "student-detail",
        targetId: "student-124"
      },
      {
        id: 3,                               // 부모 ID
        body: "오늘 숙제를 확인해 주세요.",    // title 없이도 가능
        target: "homework",
        targetId: "hw-456"
      }
    ],
    schoolId: 1,
    schoolName: "삼척초등학교",
    role: "PARENT",
    senderPhone: "01012345678",
  });
}
```

#### 사용자들에게 개별 알림
```typescript
async sendPersonalizedToUsers() {
  await this.notificationService.sendPersonalizedNotificationToUsers({
    messageType: 'ping.personal',
    notifications: [
      {
        id: 101,                             // 사용자 ID
        title: "김선생님께",
        body: "3학년 1반 교실 환기 상태를 확인해 주세요",
        target: "classroom-status",
        targetId: "room-301"
      },
      {
        id: 102,                             // 사용자 ID
        title: "박선생님께",
        body: "오늘 체육 수업이 실내로 변경되었습니다",
        target: "schedule",
        targetId: "pe-class-001"
      }
    ],
    schoolId: 1,
    schoolName: "삼척초등학교",
    role: "INSTRUCTOR",
    senderPhone: "01012345678",
  });
}
```

## 📋 파라미터 상세 설명

### Bulk 알림 파라미터 (`BulkNotificationRequest`)

- `messageType`: 메시지 타입 (예: 'ping.class', 'letter.notice', 'ping.exit')
- `ids`: 알림을 보낼 수신자 ID 배열 (부모 또는 사용자 ID)
- `schoolId`: 학교 ID (Firehose 로깅용 필수)
- `schoolName`: 학교명 (Firehose 로깅용 필수)
- `title`: 알림 제목 (선택사항)
- `body`: 알림 메시지 (필수)
- `role`: FCM 데이터에 포함할 사용자 역할 (`INSTRUCTOR`, `PARENT`, `OTHER`)
- `target`: FCM 데이터에 포함할 대상 페이지/섹션 (선택사항)
- `targetId`: FCM 데이터에 포함할 대상 ID (선택사항)
- `senderPhone`: SMS 발신 전화번호 (선택사항, 푸시 토큰이 없는 사용자에게 SMS를 보내려면 필수)

### Personalized 알림 파라미터 (`IndividualNotificationRequest`)

- `messageType`: 메시지 타입
- `notifications`: 개별 알림 배열 (`NotificationTarget[]`)
  - `id`: 대상 부모/사용자 ID
  - `title`: 개별 제목 (선택사항)
  - `body`: 개별 메시지 내용 (필수)
  - `target`: 개별 대상 페이지 (선택사항)
  - `targetId`: 개별 대상 ID (선택사항)
- `schoolId`: 학교 ID
- `schoolName`: 학교명
- `role`: 사용자 역할
- `senderPhone`: SMS 발신 전화번호

## 🎯 FCM 데이터 구조

푸시 알림 클릭 시 앱 내비게이션을 위한 데이터:
```json
{
  "page": "announcements",        // 이동할 화면
  "args": "{\"role\":\"PARENT\",\"targetId\":\"123\"}"  // 화면에 전달할 파라미터
}
```

## 📱 스마트 알림 라우팅

### FCM 푸시 알림 (우선순위 1)
- **조건**: 사용자가 유효한 `pushToken`을 가지고 있는 경우
- **방법**: Firebase Cloud Messaging
- **데이터**: 앱 내비게이션용 role, targetId 포함

### SMS 대체 수단 (우선순위 2)
- **조건**: 사용자가 `pushToken`은 없지만 유효한 `phone` 번호가 있는 경우
- **방법**: Aligo SMS 서비스
- **형식**: `[제목] 내용` (제목이 제공된 경우 앞에 추가)
- **요구사항**: `senderPhone` 파라미터가 제공되어야 함

### 알림 불가
- `pushToken`과 `phone` 모두 없는 사용자는 로그만 남기고 알림되지 않음

## ✨ 주요 기능

- ✅ **4가지 알림 방식**: Bulk/Personalized × Parents/Users
- ✅ **하이브리드 전송**: FCM + SMS 대체로 최대 도달률 확보
- ✅ **지능형 라우팅**: 사용자별로 최적의 전송 방법 자동 선택
- ✅ **배치 처리**: 푸시 알림을 위한 효율적인 FCM multicast
- ✅ **개별 처리**: Personalized 알림에서 각 사용자별 개별 전송
- ✅ **포괄적 로깅**: FCM과 SMS 모두의 성공/실패 추적
- ✅ **Firehose 통합**: 모든 메트릭을 Firehose를 통해 S3에 로깅
- ✅ **에러 복원력**: 개별 실패가 전체 프로세스를 중단시키지 않음
- ✅ **논블로킹 로깅**: Firehose 실패가 알림을 중단시키지 않음
- ✅ **아키텍처 개선**: DataSource 활용으로 도메인 독립성 확보

## 📊 로깅 및 모니터링

### 콘솔 로깅
```
// Bulk 알림
Notification summary - FCM: 3/5, SMS: 1/2

// Personalized 알림
Personalized notification summary for parents - FCM: 2/3, SMS: 1/1
```

의미:
- `FCM: 3/5` = 5번 시도 중 3번 FCM 전송 성공
- `SMS: 1/2` = 2번 시도 중 1번 SMS 전송 성공

### Firehose 로그 형식

#### Bulk 알림 로그
```json
{
  "messageType": "ping.class",
  "schoolId": 1,
  "schoolName": "삼척초등학교",
  "title": "중요 공지",
  "body": "모든 부모님께 전달하는 메시지",
  "ids": [1, 2, 3, 4, 5],
  "role": "PARENT",
  "fcmSuccessCount": 3,
  "fcmFailureCount": 2,
  "smsSuccessCount": 1,
  "smsFailureCount": 1,
  "year": "2024",
  "month": "03",
  "day": "15",
  "hour": "14",
  "school_id": 1,
  "role_type": "PARENT",
  "timestamp": "2024-03-15T14:30:00.000+09:00",
  "total_users": 5,
  "total_success": 4,
  "total_failure": 1,
  "success_rate": 80
}
```

#### Personalized 알림 로그
```json
{
  "messageType": "letter.report",
  "schoolId": 1,
  "schoolName": "삼척초등학교",
  "title": "Personalized Messages",
  "body": "3 personalized messages sent",
  "ids": [1, 2, 3],
  "role": "PARENT",
  "fcmSuccessCount": 2,
  "fcmFailureCount": 0,
  "smsSuccessCount": 1,
  "smsFailureCount": 0,
  // ... 기타 메타데이터
}
```

## 🎬 사용 시나리오

### 시나리오 1: 전체 공지 (Bulk)
```typescript
// 모든 부모에게 동일한 급식 공지
await notificationService.sendBulkNotificationToParents({
  messageType: 'letter.notice',
  ids: [1, 2, 3, 4, 5],
  schoolId: 1,
  schoolName: "삼척초등학교",
  title: "급식 공지",
  body: "내일은 김치찌개와 불고기가 나옵니다",
  role: "PARENT",
  target: "meal-schedule",
  targetId: "meal-2024-03-16",
  senderPhone: "01012345678"
});
```

### 시나리오 2: 개별 성적 통지 (Personalized)
```typescript
// 각 부모에게 자녀별 개별 성적 통지
await notificationService.sendPersonalizedNotificationToParents({
  messageType: 'letter.report',
  notifications: [
    {
      id: 1,
      title: "김철수 어머님께",
      body: "철수의 중간고사 성적: 수학 95점, 국어 88점, 영어 92점",
      target: "grade-report",
      targetId: "student-123-midterm"
    },
    {
      id: 2, 
      title: "이영희 아버님께",
      body: "영희의 중간고사 성적: 수학 100점, 국어 96점, 영어 94점",
      target: "grade-report", 
      targetId: "student-124-midterm"
    }
  ],
  schoolId: 1,
  schoolName: "삼척초등학교",
  role: "PARENT",
  senderPhone: "01012345678"
});
```

### 시나리오 3: 교사 개별 업무 알림 (Personalized)
```typescript
// 각 교사에게 개별 업무 배정
await notificationService.sendPersonalizedNotificationToUsers({
  messageType: 'ping.task',
  notifications: [
    {
      id: 101,
      title: "김선생님",
      body: "3학년 1반 교실 정리 및 환기를 부탁드립니다",
      target: "task-detail",
      targetId: "task-001"
    },
    {
      id: 102,
      title: "박선생님", 
      body: "체육관 기자재 점검을 부탁드립니다",
      target: "task-detail",
      targetId: "task-002"
    }
  ],
  schoolId: 1,
  schoolName: "삼척초등학교",
  role: "INSTRUCTOR",
  senderPhone: "01012345678"
});
```

### 시나리오 4: 응급상황 대응 (Bulk + Personalized 조합)
```typescript
// 1단계: 모든 교사에게 응급상황 알림 (Bulk)
await notificationService.sendBulkNotificationToUsers({
  messageType: 'ping.emergency',
  ids: [101, 102, 103, 104, 105],
  schoolId: 1,
  schoolName: "삼척초등학교",
  title: "응급상황 발생",
  body: "학교에 응급상황이 발생했습니다. 각자 맡은 역할을 수행해 주세요",
  role: "INSTRUCTOR",
  target: "emergency-protocol",
  senderPhone: "01012345678"
});

// 2단계: 각 교사에게 개별 역할 배정 (Personalized)
await notificationService.sendPersonalizedNotificationToUsers({
  messageType: 'ping.emergency.task',
  notifications: [
    {
      id: 101,
      body: "1층 학생들 대피 지도를 담당해 주세요",
      target: "emergency-task",
      targetId: "evacuation-floor1"
    },
    {
      id: 102,
      body: "2층 학생들 대피 지도를 담당해 주세요",
      target: "emergency-task", 
      targetId: "evacuation-floor2"
    }
  ],
  schoolId: 1,
  schoolName: "삼척초등학교",
  role: "INSTRUCTOR",
  senderPhone: "01012345678"
});
```

## 🔧 TypeScript 타입 정의

```typescript
// 대량 알림 요청 (여러 수신자에게 동일한 메시지)
export type BulkNotificationRequest = {
  messageType: string;
  ids: number[]; // parentIds 또는 userIds
  schoolId: number;
  schoolName: string;
  title?: string;
  body: string;
  role: string;
  target?: string;
  targetId?: string;
  senderPhone: string;
};

// 개별 알림 아이템
export type NotificationTarget = {
  id: number; // parentId or userId
  title?: string;
  body: string;
  target?: string;
  targetId?: string;
};

// 개별화된 알림 요청 (각 수신자별 다른 메시지)
export type IndividualNotificationRequest = {
  messageType: string;
  notifications: NotificationTarget[];
  schoolId: number;
  schoolName: string;
  role: string;
  senderPhone: string;
};

// 알림 결과
export type NotificationResult = {
  success: boolean;
  error?: Error;
  retryable?: boolean;
};
```

## 🎯 메서드 선택 가이드

| 상황 | 추천 메서드 | 설명 |
|------|-------------|------|
| 전체 공지사항 | `sendBulkNotificationToParents/Users` | 모든 대상에게 동일한 내용 |
| 개별 성적통지 | `sendPersonalizedNotificationToParents` | 각 학생별 다른 성적 |
| 개별 업무배정 | `sendPersonalizedNotificationToUsers` | 각 교사별 다른 업무 |
| 급식 메뉴 안내 | `sendBulkNotificationToParents` | 모든 부모에게 동일한 메뉴 |
| 맞춤형 상담 일정 | `sendPersonalizedNotificationToParents` | 각 부모별 다른 상담 시간 |

이제 NotificationService는 다양한 알림 요구사항을 효율적으로 처리할 수 있는 완전한 솔루션을 제공합니다! 🚀