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

#### Role 파티션
```
role=INSTRUCTOR/  (강사)
role=PARENT/  (학부모)
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
              "ParameterValue": "{year:.year,month:.month,day:.day,hour:.hour,school_id:.school_id,role:.role}"
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
          parameter_value = "{year:.year,month:.month,day:.day,hour:.hour,school_id:.school_id,role:.role}"
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
  role string
)
STORED AS JSON
LOCATION 's3://your-bucket/fcm-log-stream/'
```

## 최적화된 쿼리 예시

### 1. 특정 날짜 범위의 성공률 분석
```sql
SELECT 
  role,
  message_type,
  AVG(success_rate) as avg_success_rate,
  SUM(total_users) as total_users
FROM notification_logs
WHERE year = '2024' 
  AND month = '03'
  AND day BETWEEN '01' AND '07'
GROUP BY role, message_type
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
  AND role = 'PARENT'
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

## 최적화된 Firehose 설정 (중복 필드 제거 후)

### ✅ 개선된 Dynamic Partitioning 설정

```json
{
  "DeliveryStreamName": "notification-logs-optimized",
  "DeliveryStreamType": "DirectPut",
  "S3DestinationConfiguration": {
    "Prefix": "logs/year=!{partitionKeyFromQuery:year}/month=!{partitionKeyFromQuery:month}/day=!{partitionKeyFromQuery:day}/hour=!{partitionKeyFromQuery:hour}/school=!{partitionKeyFromQuery:school_id}/role=!{partitionKeyFromQuery:role_type}/",
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
              "ParameterValue": "{year:.year,month:.month,day:.day,hour:.hour,school_id:.school_id,role_type:.role_type}"
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

### 📋 개선된 Terraform 설정

```hcl
resource "aws_kinesis_firehose_delivery_stream" "notification_logs_optimized" {
  name        = "notification-logs-optimized"
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
          parameter_value = "{year:.year,month:.month,day:.day,hour:.hour,school_id:.school_id,role:.role}"
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

## 개선된 데이터 구조

### ❌ 기존 JSON (중복 필드)
```json
{
  "messageType": "ping.class",
  "message_type": "ping.class",  // 중복!
  "schoolId": 1,
  "school_id": 1,                // 중복!
  "role": "PARENT",              // role로 통일
  ...
}
```

### ✅ 개선된 JSON (중복 제거)
```json
{
  "message_type": "ping.class",
  "school_id": 1,
  "school_name": "삼척초등학교",
  "role": "PARENT",
  "user_ids": [1, 2],
  "fcm_success_count": 1,
  "fcm_failure_count": 0,
  "sms_success_count": 1,
  "sms_failure_count": 0,
  "year": "2025",
  "month": "06", 
  "day": "08",
  "hour": "12",
  "timestamp": "2025-06-08T12:03:15.643+09:00",
  "total_users": 2,
  "total_success": 2,
  "total_failure": 0,
  "success_rate": 100
}
```

## 성능 비교: 기존 vs Dynamic Partitioning

### 📊 **시나리오**: 학교ID=123의 지난 1주일 알림 데이터 조회

#### ❌ 기존 방식 (시간 파티션만)
```sql
-- 물리적 구조: /logs/2025/06/01/ ~ /logs/2025/06/07/
-- 각 날짜에 1000개 학교의 데이터가 혼재

SELECT school_id, AVG(success_rate) 
FROM notification_logs 
WHERE year='2025' AND month='06' AND day BETWEEN '01' AND '07'
  AND school_id = 123  -- 애플리케이션 레벨 필터링
GROUP BY school_id
```

**스캔되는 데이터:**
- 7일 × 1000개 학교 = 7,000개 파일 스캔
- 데이터 크기: ~700MB 스캔 (각 파일 100KB 가정)
- **비용**: $3.50 (Athena $5/TB 기준)

#### ✅ Dynamic Partitioning 적용 후
```sql
-- 물리적 구조: /logs/year=2025/month=06/day=01/school=123/
-- 해당 학교 데이터만 별도 파티션에 저장

SELECT school_id, AVG(success_rate) 
FROM notification_logs 
WHERE year='2025' AND month='06' AND day BETWEEN '01' AND '07'
  AND school_id = 123  -- 파티션 레벨 필터링
GROUP BY school_id
```

**스캔되는 데이터:**
- 7일 × 1개 학교 = 7개 파일만 스캔  
- 데이터 크기: ~700KB 스캔
- **비용**: $0.0035 (1000배 절약!)

### 📈 **성능 개선 지표**

| 메트릭 | 기존 방식 | Dynamic Partitioning | 개선 효과 |
|--------|----------|---------------------|-----------|
| 스캔 파일 수 | 7,000개 | 7개 | **1000배 감소** |
| 스캔 데이터 크기 | 700MB | 700KB | **1000배 감소** |
| 쿼리 비용 | $3.50 | $0.0035 | **1000배 절약** |
| 쿼리 실행 시간 | 30-60초 | 1-3초 | **10-20배 빠름** |

### 🏢 **실제 사용 케이스별 개선 효과**

#### 1. 학교별 월간 리포트
```sql
-- 특정 학교의 월간 알림 성과 분석
SELECT 
  message_type,
  AVG(success_rate) as avg_success_rate,
  SUM(total_users) as total_recipients
FROM notification_logs 
WHERE year='2025' AND month='06' AND school_id=123
GROUP BY message_type
```
**개선**: 1개월 데이터 조회 시 **31,000개** → **31개** 파일 스캔

#### 2. 역할별 성과 분석  
```sql
-- 학부모 vs 강사 알림 효과 비교
SELECT 
  role,
  COUNT(*) as notification_count,
  AVG(success_rate) as avg_success_rate
FROM notification_logs 
WHERE year='2025' AND month='06' AND school_id=123
GROUP BY role
```
**개선**: 역할별 파티션으로 더욱 세분화된 스캔 가능

#### 3. 실시간 대시보드 쿼리
```sql  
-- 오늘 학교별 알림 현황 (실시간)
SELECT 
  school_id,
  SUM(total_success) as today_success,
  SUM(total_failure) as today_failure
FROM notification_logs 
WHERE year='2025' AND month='06' AND day='08' 
  AND school_id IN (1,2,3,4,5)  -- 특정 학교들만
GROUP BY school_id
```
**개선**: 각 학교별 파티션에서 병렬 조회로 **응답시간 대폭 단축** 

## 🚀 Dynamic Partitioning 설정 가이드 (추가 서비스 불필요!)

### ✅ **핵심: Lambda나 Glue 없이 Firehose 설정만으로 충분**

Dynamic Partitioning은 Firehose의 **내장 기능**입니다. 한 번 설정하면 자동으로 작동합니다.

### 💰 **비용 비교**

| 방식 | 기본 비용 | 추가 비용 | 총 비용 |
|------|----------|----------|---------|
| **Dynamic Partitioning** | $0.029/GB | **+$0.0015/GB** | **$0.0305/GB** |
| Lambda 처리 | $0.029/GB | +$0.02-0.05/GB | $0.049-0.079/GB |
| Glue 처리 | $0.029/GB | +$0.44/DPU-hour | 훨씬 비쌈 |

**➡️ Dynamic Partitioning이 가장 비용 효율적!**

### 🔧 **1단계: Terraform으로 한 번만 설정**

```hcl
# firehose.tf
resource "aws_kinesis_firehose_delivery_stream" "notification_logs" {
  name        = "notification-logs-stream"
  destination = "s3"

  s3_configuration {
    role_arn   = aws_iam_role.firehose_role.arn
    bucket_arn = aws_s3_bucket.logs.arn
    
    # 🎯 핵심: 이 설정만으로 Dynamic Partitioning 활성화
    prefix = "logs/year=!{partitionKeyFromQuery:year}/month=!{partitionKeyFromQuery:month}/day=!{partitionKeyFromQuery:day}/school=!{partitionKeyFromQuery:school_id}/role=!{partitionKeyFromQuery:role}/"
    
    dynamic_partitioning {
      enabled = true  # 🚀 이것만 true로 설정!
    }

    processing_configuration {
      enabled = true
      processors {
        type = "MetadataExtraction"  # 🔍 JSON에서 메타데이터 추출
        parameters {
          parameter_name  = "MetadataExtractionQuery"
          parameter_value = "{year:.year,month:.month,day:.day,school_id:.school_id,role:.role}"
        }
      }
    }
  }
}

# IAM 역할 (Firehose 기본 권한만 필요)
resource "aws_iam_role" "firehose_role" {
  name = "firehose-delivery-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"  # Firehose만!
        }
      }
    ]
  })
}
```

### 📝 **2단계: 애플리케이션에서 메타데이터만 추가**

```typescript
// notification.service.ts에서 이미 구현됨
const logData = {
  // 🔍 Firehose가 읽을 메타데이터 (파티션 키로 사용)
  year: "2025",
  month: "06", 
  day: "08",
  school_id: 123,
  role: "PARENT",
  
  // 실제 로그 데이터
  message_type: "ping.class",
  success_rate: 95,
  // ... 기타 필드
};

await this.firehoseService.sendRecord(logData);
```

### 🎯 **3단계: 끝! 자동으로 파티셔닝됨**

Firehose가 자동으로 다음과 같은 구조를 생성합니다:

```
s3://your-bucket/logs/
├── year=2025/month=06/day=08/school=123/role=PARENT/
│   ├── 2025-06-08-12-00-001.gz
│   └── 2025-06-08-12-05-002.gz
├── year=2025/month=06/day=08/school=456/role=INSTRUCTOR/
│   ├── 2025-06-08-12-01-001.gz
│   └── 2025-06-08-12-06-002.gz
└── year=2025/month=06/day=08/school=789/role=PARENT/
    ├── 2025-06-08-12-02-001.gz
    └── 2025-06-08-12-07-002.gz
```

### ⚡ **왜 Lambda/Glue가 불필요한가?**

#### ❌ **Lambda 방식의 문제점**
```javascript
// Lambda 함수 필요 (추가 개발 + 운영)
exports.handler = async (event) => {
  // 복잡한 변환 로직
  // 에러 처리
  // 모니터링
  // 스케일링 관리
  return transformedData;
};
```

#### ✅ **Dynamic Partitioning 방식**
```typescript
// 그냥 JSON에 메타데이터 포함하면 끝!
const logData = {
  school_id: 123,  // Firehose가 자동으로 school=123/ 디렉터리 생성
  year: "2025",    // Firehose가 자동으로 year=2025/ 디렉터리 생성
  // ... 기타 데이터
};
```

### 📊 **실제 월간 비용 예시 (중간 규모 서비스)**

```
🏫 가정: 100개 학교, 일 1GB 로그 데이터

Dynamic Partitioning:
- Firehose: 30GB × $0.0305 = $0.915/월
- S3 스토리지: 30GB × $0.023 = $0.69/월
- 총 비용: $1.61/월

Lambda 방식:
- Firehose: 30GB × $0.029 = $0.87/월  
- Lambda: 30GB × $0.03 = $0.9/월 (추가)
- S3 스토리지: $0.69/월
- 총 비용: $2.46/월 (53% 더 비쌈)

연간 절약: ($2.46 - $1.61) × 12 = $10.2
```

### 🎉 **결론: 설정 한 번으로 모든 것 해결!**

1. **추가 서비스 불필요**: Lambda, Glue, EMR 등 전혀 필요 없음
2. **비용 효율적**: 기본 Firehose 요금에 5%만 추가 
3. **관리 부담 없음**: 설정 후 자동 동작, 별도 운영 불필요
4. **즉시 적용**: Terraform apply 한 번으로 활성화