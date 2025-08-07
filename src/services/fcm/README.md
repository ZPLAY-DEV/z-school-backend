# FCM Service - 메시지 발송 최적화 전략

## 🎯 개요

FCM Service는 Firebase Cloud Messaging을 통해 푸시 알림을 발송하는 서비스입니다. 
메시지 발송 비용과 성능을 최적화하기 위해 **스마트한 그룹화 전략**을 사용합니다.

## 📊 메시지 그룹화 전략

### 그룹화 기준

메시지들이 다음 5가지 속성이 **완전히 동일한지**를 기준으로 그룹화합니다:

- `title` (제목)
- `body` (내용) 
- `role` (역할)
- `page` (페이지)
- `args` (추가 인자)

```typescript
private createContentKey(message: SingleFcmInput): string {
  return [
    message.title || '',
    message.body,
    message.role,
    message.page || '',
    message.args || '',
  ].join('|');
}
```

### 발송 방식 결정

그룹화 결과에 따라 2가지 발송 방식을 선택합니다:

#### 1. 개별 발송 (그룹 크기 = 1)
```typescript
if (messages.length === 1) {
  // sendSingleMessageToSingleDestination() 사용
  // Firebase send() 메서드
}
```
- 내용이 고유한 메시지
- 단일 사용자 대상
- Firebase의 `send()` 메서드 사용

#### 2. 배치 발송 (그룹 크기 > 1)
```typescript
else {
  // sendSingleMessageToMultipleDestinations() 사용
  // Firebase sendEachForMulticast() 메서드
}
```
- 동일한 내용을 여러 사용자에게 발송
- Firebase의 `sendEachForMulticast()` 메서드 사용
- **500개씩 청크로 나누어** 발송 (Firebase 제한)

## 💰 최적화 효과

### 1. API 호출 횟수 감소
- **개별 발송**: N번의 API 호출
- **배치 발송**: N/500번의 API 호출

### 2. 네트워크 오버헤드 감소
- 동일한 페이로드를 한 번만 구성
- 여러 토큰에 대해 재사용

### 3. 비용 절약
- Firebase FCM API 호출 비용 절약
- 네트워크 대역폭 절약

## 📈 성능 최적화

### 1. Rate Limiting 방지
```typescript
if (index < tokenBatches.length - 1) {
  await delay(100); // 배치 간 100ms 지연
}
```

### 2. 재시도 로직
```typescript
for (let attempt = 1; attempt <= 3; attempt++) {
  // 최대 3번 재시도
}
```

### 3. 무효 토큰 처리
- 발송 실패 시 무효한 토큰들을 수집
- 향후 정리 작업에 활용

## 🎯 실제 사용 예시

### 입력 메시지
```typescript
const messages = [
  { id: 1, token: 'tokenA', title: 'Hello', body: 'This is a message', role: 'PARENT', page: 'home', args: '123' },
  { id: 2, token: 'tokenB', title: 'Hello', body: 'This is a message', role: 'PARENT', page: 'home', args: '123' },
  { id: 3, token: 'tokenC', title: 'Alert', body: 'Another message', role: 'INSTRUCTOR' },
  { id: 4, token: 'tokenD', title: 'Hello', body: 'This is a message', role: 'PARENT', page: 'home', args: '456' },
];
```

### 그룹화 결과
```typescript
[
  [ // 그룹 1: 배치 발송 (2개 메시지)
    { id: 1, token: 'tokenA', title: 'Hello', body: 'This is a message', role: 'PARENT', page: 'home', args: '123' },
    { id: 2, token: 'tokenB', title: 'Hello', body: 'This is a message', role: 'PARENT', page: 'home', args: '123' },
  ],
  [ // 그룹 2: 개별 발송 (1개 메시지)
    { id: 3, token: 'tokenC', title: 'Alert', body: 'Another message', role: 'INSTRUCTOR' },
  ],
  [ // 그룹 3: 개별 발송 (1개 메시지)
    { id: 4, token: 'tokenD', title: 'Hello', body: 'This is a message', role: 'PARENT', page: 'home', args: '456' },
  ]
]
```

### 발송 방식
- **그룹 1**: `sendEachForMulticast()` - 2개 토큰에 동일한 메시지 배치 발송
- **그룹 2**: `send()` - 개별 발송
- **그룹 3**: `send()` - 개별 발송

## 🔧 주요 메서드

### `sendMultipleMessagesToMultipleDestinations()`
- 메인 진입점
- 메시지 그룹화 및 최적화된 발송 방식 선택

### `groupMessagesByContent()`
- 메시지 내용 기반 그룹화
- 동일한 내용의 메시지들을 하나의 그룹으로 묶음

### `sendSingleMessageToMultipleDestinations()`
- 배치 발송 처리
- 500개씩 청크로 나누어 발송

### `sendSingleMessageToSingleDestination()`
- 개별 발송 처리
- 단일 메시지 발송

## 📝 주의사항

1. **그룹화 기준의 엄격성**: 5가지 속성이 완전히 동일해야만 같은 그룹으로 분류됩니다.
2. **Firebase 제한**: 배치 발송 시 최대 500개 토큰까지만 한 번에 처리 가능합니다.
3. **무효 토큰**: 발송 실패한 토큰들은 `invalidTokens` 배열에 수집되므로 정기적으로 정리해야 합니다. 