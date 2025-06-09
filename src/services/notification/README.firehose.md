# Firehose Partitioning

## 개요
학부모에게 보낸 알림 로그. school, type 기반 파티셔닝으로 Athena 쿼리 성능 최적화

## 파티셔닝 구조
```
logs/year=2025/month=01/day=15/hour=09/school=123/type=ping.exit/
```

### Message Types
- `ping.exit`: 하교알림
- `ping.class`: 수업관련알림  
- `ping.other`: 기타알림
- `dispatch.registration`: 수강신청
- `dispatch.notice`: 공지사항
- `dispatch.survey`: 설문조사

### 2. 비즈니스 로직 기반 파티셔닝

#### School Id 파티션
```
school=123/  (개별 학교ID)
```

#### Message Type 파티션
```
type=ping.exit/           (하교알림)
type=ping.class/          (수업관련알림)
type=ping.other/          (기타알림)
type=letter.registration/ (수강신청)
type=letter.notice/       (공지사항)
type=letter.survey/       (설문조사)
```

## Firehose 설정 예시

- S3 에 notification-logs-bucket 을 설정 후,

### ✅ s3-config.json (Lambda 없이 Dynamic Partitioning)

```json
{
  "DeliveryStreamName": "notification-logs-stream",
  "DeliveryStreamType": "DirectPut",
  "S3DestinationConfiguration": {
    "RoleARN": "arn:aws:iam::000000000000:role/firehose_delivery_role",
    "BucketARN": "arn:aws:s3:::notification-logs-bucket",
    "Prefix": "logs/year=!{partitionKeyFromQuery:year}/month=!{partitionKeyFromQuery:month}/day=!{partitionKeyFromQuery:day}/hour=!{partitionKeyFromQuery:hour}/school=!{partitionKeyFromQuery:school}/type=!{partitionKeyFromQuery:type}/",
    "ErrorOutputPrefix": "errors/",
    "BufferingHints": {
      "SizeInMBs": 1,
      "IntervalInSeconds": 60
    },
    "CompressionFormat": "GZIP",
    "DynamicPartitioningConfiguration": {
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
              "ParameterValue": "{year:.year,month:.month,day:.day,hour:.hour,school:.school,type:.type}"
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

## Athena 테이블 생성 예시

```
awslocal athena start-query-execution \
  --query-string "CREATE EXTERNAL TABLE IF NOT EXISTS notification_logs (
  school_name string,
  title string,
  body string,
  user_ids array<int>,
  role string,
  fcm_success_count int,
  fcm_failure_count int,
  sms_success_count int,
  sms_failure_count int,
  timestamp string,
  total_users int,
  total_success int,
  total_failure int,
  success_rate int
)
PARTITIONED BY (
  year string,
  month string,
  day string,
  hour string,
  school string,
  type string
)
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
WITH SERDEPROPERTIES (
  'ignore.malformed.json' = 'true'
)
LOCATION 's3://notification-logs-bucket/notification-logs-stream/'" \
  --query-execution-context Database=logs \
  --result-configuration OutputLocation=s3://notification-logs-bucket
```

## 최적화된 쿼리 예시

### 1. 메시지 유형별 성공률 분석 (파티션 최적화)
```sql
SELECT 
  type,
  AVG(success_rate) as avg_success_rate,
  SUM(total_users) as total_users,
  COUNT(*) as notification_count
FROM notification_logs
WHERE year = '2024' 
  AND month = '03'
  AND day BETWEEN '01' AND '07'
  AND type IN ('ping.exit', 'ping.class')  -- 파티션 필터링
GROUP BY type
```

### 2. 특정 학교의 하교알림 성능 분석
```sql
SELECT 
  day,
  COUNT(*) as daily_notifications,
  AVG(success_rate) as avg_success_rate,
  SUM(total_users) as total_recipients
FROM notification_logs
WHERE year = '2024'
  AND month = '03'
  AND school = 1234
  AND type = 'ping.exit'  -- 하교알림만 파티션 스캔
GROUP BY day
ORDER BY day
```

### 3. 시간대별 메시지 유형 패턴 분석
```sql
SELECT 
  hour,
  type,
  COUNT(*) as notification_count,
  AVG(total_users) as avg_recipients
FROM notification_logs
WHERE year = '2024'
  AND month = '03'
  AND type LIKE 'ping.%'  -- ping 관련 알림만
GROUP BY hour, type
ORDER BY hour, type
```
