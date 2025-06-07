# Firehose Partitioning 최적화 가이드

## 개요
Athena 쿼리 성능 최적화와 비용 절감을 위한 Firehose partitioning 전략입니다.
**Lambda 없이도 Dynamic Partitioning으로 비즈니스 로직 기반 파티셔닝이 가능합니다.**

## 파티셔닝 방식 비교

### 🚀 **추천: Lambda 없는 Dynamic Partitioning**
- **비용**: Lambda 비용 없음 (Firehose 기본 요금만)
- **복잡성**: 낮음 (애플리케이션에서 메타데이터 생성)
- **지연시간**: 낮음 (Lambda 콜드스타트 없음)
- **유지보수**: 용이함

### 💰 **대안: Lambda 기반 Processing**
- **비용**: Lambda 실행 비용 추가
- **복잡성**: 높음 (별도 Lambda 함수 관리)
- **지연시간**: 높음 (Lambda 처리 시간)
- **유연성**: 매우 높음 (복잡한 변환 가능)

## 파티셔닝 전략

### 1. 시간 기반 파티셔닝 (필수)
```
year=2024/month=03/day=15/hour=14/
```

**장점:**
- 가장 일반적인 쿼리 패턴 (특정 날짜/시간 범위)
- 시계열 분석에 최적화
- 자동으로 오래된 데이터 관리 가능

### 2. 비즈니스 로직 기반 파티셔닝 (Lambda 불필요)

#### School Id 파티션
```
school_id=123/  (개별 학교ID)
```

#### Role Type 파티션
```
role_type=INSTRUCTOR/  (강사)
role_type=PARENT/  (학부모)
```

#### Message Type 컬럼 (파티션 아니고 일반 칼럼임)
- **ping.exit**: 하교알림
- **ping.class**: 수업관련알림 (수업시작, 수업종료, 지각, 결석, ...)
- **ping.other**: 기타알림
- **letter.registration**: 수강신청
- **letter.notice**: 공지사항
- **letter.survey**: 설문조사

## Firehose 설정 예시

### ✅ Lambda 없는 Dynamic Partitioning 설정 (추천)

```json
{
  "DeliveryStreamName": "notification-logs-stream",
  "DeliveryStreamType": "DirectPut",
  "S3DestinationConfiguration": {
    "Prefix": "logs/year=!{partitionKeyFromQuery:year}/month=!{partitionKeyFromQuery:month}/day=!{partitionKeyFromQuery:day}/hour=!{partitionKeyFromQuery:hour}/school=!{partitionKeyFromQuery:school_id}/role=!{partitionKeyFromQuery:role}/",
    "ErrorOutputPrefix": "errors/",
    "BufferingHints": {
      "SizeInMBs": 64,
      "IntervalInSeconds": 60
    },
    "CompressionFormat": "GZIP",
    "DynamicPartitioning": {
      "Enabled": true,
      "RetryOptions": {
        "DurationInSeconds": 3600
      }
    },
    "ProcessingConfiguration": {
      "Enabled": true,
      "Processors": [
        {
          "Type": "MetadataExtraction",
          "Parameters": [
            {
              "ParameterName": "MetadataExtractionQuery",
              "ParameterValue": "{year:.year,month:.month,day:.day,hour:.hour,school_id:.school_id,role:.role_type}"
            },
            {
              "ParameterName": "JsonParsingEngine",
              "ParameterValue": "JQ-1.6"
            }
          ]
        }
      ]
    }
  }
}
```

### 📋 Terraform 설정 예시

```hcl
resource "aws_kinesis_firehose_delivery_stream" "notification_logs" {
  name        = "notification-logs-stream"
  destination = "s3"

  s3_configuration {
    role_arn           = aws_iam_role.firehose_delivery_role.arn
    bucket_arn         = aws_s3_bucket.notification_logs.arn
    prefix             = "logs/year=!{partitionKeyFromQuery:year}/month=!{partitionKeyFromQuery:month}/day=!{partitionKeyFromQuery:day}/hour=!{partitionKeyFromQuery:hour}/school=!{partitionKeyFromQuery:school_id}/role=!{partitionKeyFromQuery:role}/"
    error_output_prefix = "errors/"
    buffer_size        = 64
    buffer_interval    = 60
    compression_format = "GZIP"

    dynamic_partitioning {
      enabled = true
      retry_duration = 3600
    }

    processing_configuration {
      enabled = true

      processors {
        type = "MetadataExtraction"

        parameters {
          parameter_name  = "MetadataExtractionQuery"
          parameter_value = "{year:.year,month:.month,day:.day,hour:.hour,school_id:.school_id,role:.role_type}"
        }

        parameters {
          parameter_name  = "JsonParsingEngine"
          parameter_value = "JQ-1.6"
        }
      }
    }
  }
}
```

### 🔄 Lambda 기반 처리 (선택사항 - 추가 비용)

```json
{
  "ProcessingConfiguration": {
    "Enabled": true,
    "Processors": [
      {
        "Type": "Lambda",
        "Parameters": [
          {
            "ParameterName": "LambdaArn",
            "ParameterValue": "arn:aws:lambda:region:account:function:firehose-transform"
          }
        ]
      }
    ]
  }
}
```

## 핵심 포인트

### ✅ **현재 구현의 장점**
1. **비용 효율성**: Lambda 비용 없음
2. **단순성**: 애플리케이션 코드에서 메타데이터 생성
3. **성능**: 실시간 처리, 지연 없음
4. **유지보수**: 비즈니스 로직 변경이 용이

### 🎯 **메타데이터 생성 전략**
```typescript
// notification.service.ts에서 구현됨
const partitionedLogData = {
  // 원본 데이터
  ...logData,
  
  // 파티션 키 (Firehose가 자동으로 추출)
  year: now.getFullYear().toString(),
  month: (now.getMonth() + 1).toString().padStart(2, '0'),
  day: now.getDate().toString().padStart(2, '0'),
  hour: now.getHours().toString().padStart(2, '0'),
  school_id: logData.schoolId,
  role_type: this.categorizeRole(logData.role),
  
  // 일반 컬럼 (파티션 아님)
  message_type: this.classifyMessageType(logData.title, logData.body),
  
  // 추가 분석 필드
  timestamp: now.toISOString(),
  total_users: logData.userIds.length,
  success_rate: this.calculateSuccessRate(successCount, totalCount)
};
```

## 비용 분석

### 📊 **Lambda 없는 방식 (현재 구현)**
- **Firehose 요금**: $0.029 per GB ingested
- **S3 스토리지**: $0.023 per GB (Standard)
- **Athena 쿼리**: $5 per TB scanned
- **총 예상 비용**: 월 $50-100 (중간 규모 서비스)

### 💸 **Lambda 추가 시**
- **Lambda 실행**: $0.0000166667 per GB-second
- **Lambda 요청**: $0.20 per 1M requests
- **추가 비용**: 월 $20-50 (트래픽에 따라)

## Athena 테이블 생성 예시

```sql
CREATE EXTERNAL TABLE notification_logs (
  schoolId bigint,
  schoolName string,
  title string,
  body string,
  userIds array<bigint>,
  role string,
  fcmSuccessCount int,
  fcmFailureCount int,
  smsSuccessCount int,
  smsFailureCount int,
  timestamp string,
  total_users int,
  total_success int,
  total_failure int,
  success_rate int,
  message_type string
)
PARTITIONED BY (
  year string,
  month string,
  day string,
  hour string,
  school_id int,
  role_type string
)
STORED AS JSON
LOCATION 's3://your-bucket/fcm-log-stream/'
```

## 최적화된 쿼리 예시

### 1. 특정 날짜 범위의 성공률 분석
```sql
SELECT 
  role_type,
  message_type,
  AVG(success_rate) as avg_success_rate,
  SUM(total_users) as total_users
FROM notification_logs
WHERE year = '2024' 
  AND month = '03'
  AND day BETWEEN '01' AND '07'
GROUP BY role_type, message_type
```

### 2. 특정 학교의 알림 성능 분석 (message_type 필터링)
```sql
SELECT 
  message_type,
  COUNT(*) as notification_count,
  AVG(success_rate) as avg_success_rate
FROM notification_logs
WHERE year = '2024'
  AND month = '03'
  AND school_id = 1234
  AND message_type = 'urgent'  -- 필요시 특정 타입 필터링
GROUP BY message_type
```

### 3. 시간대별 알림 패턴 분석
```sql
SELECT 
  hour,
  message_type,
  COUNT(*) as notification_count,
  AVG(total_users) as avg_recipients
FROM notification_logs
WHERE year = '2024'
  AND month = '03'
  AND role_type = 'PARENT'
GROUP BY hour, message_type
ORDER BY hour
```

## 비용 최적화 팁

### 1. 파티션 프루닝 활용
- WHERE 절에 항상 파티션 키 포함
- 불필요한 파티션 스캔 방지

### 2. 컬럼 선택 최적화
- SELECT * 대신 필요한 컬럼만 선택
- 집계 함수 활용으로 데이터 스캔량 감소

### 3. 데이터 압축
- GZIP 압축으로 스토리지 비용 절감
- Parquet 포맷 고려 (복잡한 분석용)

### 4. 라이프사이클 정책
- 오래된 파티션 자동 삭제/아카이브
- Intelligent Tiering 적용

## 모니터링 지표

### 1. 쿼리 성능
- 평균 쿼리 실행 시간
- 스캔된 데이터 양
- 비용 추적

### 2. 파티션 분포
- 파티션당 데이터 크기
- 핫스팟 파티션 식별
- 파티션 불균형 모니터링

### 3. 비용 최적화 메트릭
- 월별 Athena 쿼리 비용
- S3 스토리지 비용
- 데이터 전송 비용 