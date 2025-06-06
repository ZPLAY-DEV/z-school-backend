# NotificationService

NotificationService는 여러 사용자에게 알림을 전송하는 `notifyUsers` 메서드를 제공합니다. 다음과 같이 지능적으로 작동합니다:
- **FCM (Firebase Cloud Messaging)**: 푸시 토큰이 있는 사용자용
- **SMS (Aligo 서비스)**: 푸시 토큰은 없지만 전화번호가 있는 사용자용

모든 알림 데이터는 S3 저장을 위해 AWS Firehose에 로깅됩니다.

## 아키텍처 개선사항

이 서비스는 특정 도메인 레이어에 속하지 않는 범용 서비스로 설계되었습니다:
- **DataSource 활용**: `@InjectRepository` 대신 `DataSource`를 통해 User repository에 접근
- **도메인 독립성**: 특정 도메인에 종속되지 않는 범용적인 알림 서비스
- **관심사 분리**: 알림 전송 로직과 도메인 로직의 명확한 분리

## 사용법

### 모듈 Import

```typescript
import { NotificationModule } from 'src/services/notification/notification.module';

@Module({
  imports: [NotificationModule],
  // ...
})
export class YourModule {}
```

**모듈 구성**: NotificationModule은 User 엔티티에 대한 직접적인 TypeORM 모듈 의존성 없이 DataSource를 통해 동작합니다.

### 서비스 주입 및 사용

```typescript
import { NotificationService } from 'src/services/notification/notification.service';

@Injectable()
export class YourService {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async sendNotificationToUsers() {
    await this.notificationService.notifyUsers({
      userIds: [1, 2, 3, 4, 5],           // 알림을 보낼 사용자 ID 배열
      schoolId: 1,                        // 로깅용 학교 ID
      schoolName: "삼척초등학교",             // 로깅용 학교명
      title: "중요 공지",                  // 알림 제목 (선택사항)
      body: "모든 사용자에게 전달하는 중요한 메시지입니다", // 알림 내용 (필수)
      role: "instructor",                 // FCM 데이터용 사용자 역할
      target: "announcements",            // FCM 데이터용 대상 페이지/섹션
      targetId: "123",                    // FCM 데이터용 대상 ID
      senderPhone: "01012345678",         // 선택사항: 푸시 토큰이 없는 사용자용 SMS 발신번호
    });
  }
}
```

## 메서드 파라미터

- `userIds`: 알림을 보낼 사용자 ID 배열
- `schoolId`: 학교 ID (Firehose 로깅용 필수)
- `schoolName`: 학교명 (Firehose 로깅용 필수)
- `title`: 알림 제목 (선택사항)
- `body`: 알림 메시지 (필수)
- `role`: FCM 데이터에 포함할 사용자 역할
- `target`: FCM 데이터에 포함할 대상 페이지/섹션
- `targetId`: FCM 데이터에 포함할 대상 ID
- `senderPhone`: SMS 발신 전화번호 (선택사항, 푸시 토큰이 없는 사용자에게 SMS를 보내려면 필수)

## 스마트 알림 로직

서비스는 각 사용자에게 최적의 전송 방법을 자동으로 결정합니다:

### 🎯 FCM 데이터 구조
푸시 알림 클릭 시 앱 내비게이션을 위한 데이터:
```json
{
  "page": "announcements",        // 이동할 화면
  "args": "{\"role\":\"instructor\",\"targetId\":\"123\"}"  // 화면에 전달할 파라미터
}
```

### 📱 FCM 푸시 알림
- **조건**: 사용자가 유효한 `pushToken`을 가지고 있는 경우
- **방법**: Firebase Cloud Messaging multicast
- **데이터**: 앱 내비게이션용 role, targetId 포함 (page는 target과 동일)

### 📱 SMS 대체 수단
- **조건**: 사용자가 `pushToken`은 없지만 유효한 `phone` 번호가 있는 경우
- **방법**: Aligo SMS 서비스
- **형식**: `[제목] 내용` (제목이 제공된 경우 앞에 추가)
- **요구사항**: `senderPhone` 파라미터가 제공되어야 함

### ⚠️ 알림 불가
- `pushToken`과 `phone` 모두 없는 사용자는 로그만 남기고 알림되지 않음

## 주요 기능

- ✅ **하이브리드 전송**: FCM + SMS 대체로 최대 도달률 확보
- ✅ **지능형 라우팅**: 사용자별로 최적의 전송 방법 자동 선택
- ✅ **배치 처리**: 푸시 알림을 위한 효율적인 FCM multicast
- ✅ **개별 SMS**: 각 사용자에게 개별적으로 SMS 전송
- ✅ **포괄적 로깅**: FCM과 SMS 모두의 성공/실패 추적
- ✅ **Firehose 통합**: 모든 메트릭을 Firehose를 통해 S3에 로깅
- ✅ **에러 복원력**: 개별 SMS 실패가 전체 프로세스를 중단시키지 않음
- ✅ **논블로킹 로깅**: Firehose 실패가 알림을 중단시키지 않음
- ✅ **아키텍처 개선**: DataSource 활용으로 도메인 독립성 확보

## 알림 요약 로깅

서비스는 상세한 로깅을 제공합니다:

```
Notification summary - FCM: 3/5, SMS: 1/2
```

의미:
- `FCM: 3/5` = 5번 시도 중 3번 FCM 전송 성공
- `SMS: 1/2` = 2번 시도 중 1번 SMS 전송 성공

## Firehose 로그 형식

전송 메트릭을 포함한 강화된 로깅 형식:

```json
{
  "schoolId": 1,
  "schoolName": "삼척초등학교",
  "title": "중요 공지",
  "body": "모든 사용자에게 전달하는 중요한 메시지입니다",
  "userIds": [1, 2, 3, 4, 5],
  "role": "instructor",
  "fcmSuccessCount": 3,
  "fcmFailureCount": 2,
  "smsSuccessCount": 1,
  "smsFailureCount": 1
}
```

## 사용 시나리오

알림 클릭 시 앱에서는 다음과 같이 처리됩니다:
- `target` → `page`로 매핑되어 화면 라우팅
- `role`, `targetId` → `args`에 포함되어 화면에 전달

### 시나리오 1: 모든 사용자가 푸시 토큰을 가진 경우
```typescript
await notificationService.notifyUsers({
  userIds: [1, 2, 3],
  schoolId: 1,
  schoolName: "테스트 학교",
  title: "수업 변경",
  body: "수업 시간이 변경되었습니다",
  role: "student",
  target: "schedule",
  targetId: "class-101"
  // senderPhone 필요 없음 - 모두 FCM으로 전송됨
});
```

### 시나리오 2: 혼합 사용자 (푸시 토큰 있는/없는 사용자)
```typescript
await notificationService.notifyUsers({
  userIds: [1, 2, 3, 4, 5],
  schoolId: 1,
  schoolName: "테스트 학교",
  title: "긴급 알림",
  body: "날씨로 인해 오늘 학교가 휴교됩니다",
  role: "parent",
  target: "alerts",
  targetId: "weather-001",
  senderPhone: "01012345678" // SMS 대체용으로 필수
});
```

### 시나리오 3: SMS 전용 모드
```typescript
// 앱을 사용하지 않지만 전화번호가 있는 사용자들을 위해
await notificationService.notifyUsers({
  userIds: [6, 7, 8],  // 이 사용자들은 푸시 토큰이 없음
  schoolId: 1,
  schoolName: "테스트 학교",
  title: "납부 안내",
  body: "내일까지 월 수업료를 납부해 주세요",
  role: "parent",
  target: "billing",
  targetId: "invoice-123",
  senderPhone: "01012345678" // 모두 SMS로 전송됨
});
``` 