# FCM Service - 간단하고 효율적인 푸시 알림 서비스

## 개요

FCM(Firebase Cloud Messaging) 서비스는 푸시 알림을 발송하고, invalid token을 자동으로 수집하는 간단한 서비스입니다.

## 주요 기능

### 1. 단일 메시지 발송 (`sendOne`)
```typescript
const { result, invalidToken } = await fcmService.sendOne({
  token: 'device_token_here',
  notification: {
    title: '알림 제목',
    body: '알림 내용',
  },
  data: {
    role: 'PARENT',
    url: '/home',
    routes: JSON.stringify({ page: 'home' })
  },
  android: {
    priority: 'high',
    ttl: 86400,
    notification: {
      priority: 'high',
      defaultSound: true,
    },
  },
  apns: {
    payload: {
      aps: {
        badge: 1,
        sound: 'default',
      },
    },
  },
});

if (result.success) {
  console.log(`발송 성공: ${result.messageId}`);
} else {
  console.log(`발송 실패: ${result.error?.message}`);
}

// Invalid token이 있다면 정리
if (invalidToken) {
  fcmService.cleanupInvalidTokens([invalidToken]);
}
```

### 2. 다중 메시지 발송 (`sendMany`)
```typescript
const messages = [
  {
    token: 'token1',
    notification: {
      title: '공지사항',
      body: '새로운 공지가 있습니다',
    },
    data: {
      role: 'PARENT',
      url: '/notice'
    },
    android: { /* ... */ },
    apns: { /* ... */ }
  },
  {
    token: 'token2',
    notification: {
      title: '다른 제목',
      body: '다른 내용',
    },
    data: {
      role: 'INSTRUCTOR',
      url: '/dashboard'
    },
    android: { /* ... */ },
    apns: { /* ... */ }
  }
];

const { results, invalidTokens } = await fcmService.sendMany(messages);

// 결과 확인
results.forEach(result => {
  if (result.success) {
    console.log(`발송 성공: ${result.messageId}`);
  } else {
    console.log(`발송 실패: ${result.error?.message}`);
  }
});

// Invalid token 정리
if (invalidTokens.length > 0) {
  fcmService.cleanupInvalidTokens(invalidTokens);
}
```

## 타입 정의

FCM 서비스는 `src/services/notification/types.d.ts`에 정의된 타입을 사용합니다:

- `SingleFcmData`: FCM 메시지 데이터 구조
- `NotificationResult`: 발송 결과 구조

### FcmSendResult (sendOne 반환값)
```typescript
interface FcmSendResult {
  result: NotificationResult;  // 발송 결과
  invalidToken?: string;       // 유효하지 않은 토큰 (있는 경우에만)
}
```

## Invalid Token 처리

### 자동 수집
- `messaging/invalid-registration-token`
- `messaging/registration-token-not-registered`
- `messaging/invalid-argument`
- 기타 유효하지 않은 토큰 에러

### 정리 작업
```typescript
// 단일 메시지 발송 후 invalid token 정리
const { invalidToken } = await fcmService.sendOne(messageData);
if (invalidToken) {
  fcmService.cleanupInvalidTokens([invalidToken]);
}

// 다중 메시지 발송 후 invalid token 정리
const { invalidTokens } = await fcmService.sendMany(messages);
if (invalidTokens.length > 0) {
  fcmService.cleanupInvalidTokens(invalidTokens);
  
  // 데이터베이스에서도 제거
  await userService.removeInvalidTokens(invalidTokens);
}
```

## 사용 예시

### 기본 사용법
```typescript
@Injectable()
export class NotificationService {
  constructor(private readonly fcmService: FcmService) {}

  async sendNotification(messages: SingleFcmData[]) {
    try {
      const { results, invalidTokens } = await this.fcmService.sendMany(messages);
      
      // Invalid token 정리
      if (invalidTokens.length > 0) {
        this.fcmService.cleanupInvalidTokens(invalidTokens);
      }
      
      return { results, invalidTokens };
    } catch (error) {
      this.logger.error('FCM 발송 실패:', error);
      throw error;
    }
  }

  async sendSingleNotification(messageData: SingleFcmData) {
    try {
      const { result, invalidToken } = await this.fcmService.sendOne(messageData);
      
      // Invalid token 정리
      if (invalidToken) {
        this.fcmService.cleanupInvalidTokens([invalidToken]);
      }
      
      return { result, invalidToken };
    } catch (error) {
      this.logger.error('FCM 발송 실패:', error);
      throw error;
    }
  }
}
```

### 에러 처리
```typescript
const { results, invalidTokens } = await fcmService.sendMany(messages);

// 실패한 메시지들 확인
const failedMessages = results.filter(r => !r.success);
failedMessages.forEach(failed => {
  this.logger.error(`발송 실패:`, failed.error);
});

// 성공한 메시지들 확인
const successCount = results.filter(r => r.success).length;
this.logger.log(`${successCount}/${results.length} 메시지 발송 성공`);

// Invalid token 처리
if (invalidTokens.length > 0) {
  this.logger.warn(`${invalidTokens.length}개의 invalid token 발견`);
  await userService.removeInvalidTokens(invalidTokens);
}
```

## 특징

1. **단순함**: 복잡한 배치 처리나 그룹화 없이 직관적인 API
2. **효율성**: 각 메시지를 개별적으로 처리하여 커스터마이징 가능
3. **안정성**: Invalid token 자동 감지 및 수집 (단일/다중 메시지 모두)
4. **유연성**: 다양한 메시지 내용과 구조 지원
5. **타입 안전성**: 이미 정의된 타입 시스템 활용
6. **일관성**: sendOne과 sendMany 모두 동일한 방식으로 invalid token 관리

## 주의사항

1. **토큰 유효성**: 정기적으로 invalid token을 정리하여 발송 효율성 유지
2. **에러 처리**: 발송 실패 시 적절한 fallback 처리 구현
3. **로깅**: 발송 실패 시 상세한 로그 기록으로 디버깅 지원
4. **타입 준수**: `SingleFcmData` 타입에 맞는 데이터 구조 사용
5. **Invalid token 관리**: sendOne과 sendMany 모두에서 invalid token을 적절히 처리 