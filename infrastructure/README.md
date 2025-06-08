# Notification Analytics Infrastructure

이 디렉터리에는 notification service의 로깅 및 분석을 위한 AWS 인프라 설정이 포함되어 있습니다.

## 🎯 주요 변경사항

### message_type 파티셔닝으로 변경 (role 파티션 제거)
- **Before**: `role=PARENT/`, `role=INSTRUCTOR/` 파티션
- **After**: `message_type=ping.exit/`, `message_type=ping.class/` 등으로 변경
- **이유**: parent 로그만 저장하므로 role 파티션 불필요, message_type으로 더 효율적인 쿼리 가능

## 📋 인프라 구성요소

### 1. **Kinesis Data Firehose** (`firehose.tf`)
- **Dynamic Partitioning** 활성화
- **파티션 구조**: `year/month/day/hour/school_id/message_type/`
- **메타데이터 추출**: Lambda 없이 JSON 파싱
- **압축**: GZIP 적용
- **S3 라이프사이클**: IA → Glacier → 삭제 (2년)

### 2. **Amazon Athena** (`athena.tf`)
- **Glue 카탈로그**: message_type 파티션 테이블
- **파티션 프로젝션**: 자동 파티션 생성
- **사전 정의된 쿼리**: 일반적인 분석 패턴
- **워크그룹**: 비용 관리 및 결과 암호화

### 3. **S3 Buckets**
- **로그 저장소**: notification 원본 로그
- **쿼리 결과**: Athena 쿼리 결과 저장
- **암호화**: AES256 적용
- **라이프사이클**: 비용 최적화

## 🚀 배포 방법

### 1. 사전 준비
```bash
# Terraform 설치 확인
terraform version

# AWS CLI 설정
aws configure
```

### 2. 변수 설정
```bash
# terraform.tfvars 파일 생성
cp terraform.tfvars.example terraform.tfvars
# 환경에 맞게 수정
```

### 3. 배포 실행
```bash
# 인프라 디렉터리로 이동
cd infrastructure

# Terraform 초기화
terraform init

# 실행 계획 확인
terraform plan

# 인프라 배포
terraform apply
```

### 4. 환경변수 설정
배포 완료 후 애플리케이션에 다음 환경변수 설정:

```bash
# Firehose 설정
AWS_FIREHOSE_STREAM_NAME=notification-logs-stream
AWS_REGION=ap-northeast-2

# AWS 인증 (IAM Role 사용 권장)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## 📊 사용 예시

### 1. 하교알림 성과 분석
```sql
SELECT 
  school_id,
  school_name,
  COUNT(*) as daily_notifications,
  AVG(success_rate) as avg_success_rate
FROM dev_notification_logs.notification_logs
WHERE year = '2025' 
  AND month = '01'
  AND message_type = 'ping.exit'
  AND school_id = 123
GROUP BY school_id, school_name;
```

### 2. 메시지 유형별 비교
```sql
SELECT 
  message_type,
  AVG(success_rate) as avg_success_rate,
  SUM(total_users) as total_recipients
FROM dev_notification_logs.notification_logs
WHERE year = '2025' 
  AND month = '01'
  AND school_id = 123
GROUP BY message_type
ORDER BY avg_success_rate DESC;
```

## 🎯 성능 최적화

### 파티션 필터링 필수
```sql
-- ✅ 올바른 쿼리 (파티션 키 사용)
WHERE year = '2025' 
  AND month = '01'
  AND message_type = 'ping.exit'

-- ❌ 잘못된 쿼리 (파티션 키 누락)
WHERE timestamp LIKE '2025-01%'
```

### 메시지 타입 종류
- `ping.exit`: 하교알림
- `ping.class`: 수업관련알림
- `ping.other`: 기타알림
- `letter.registration`: 수강신청
- `letter.notice`: 공지사항
- `letter.survey`: 설문조사

## 💰 비용 최적화

### 1. 쿼리 최적화
- 항상 파티션 키 포함
- 필요한 컬럼만 SELECT
- LIMIT 절 사용

### 2. 스토리지 최적화
- 30일 후 IA 전환
- 90일 후 Glacier 전환
- 2년 후 자동 삭제

### 3. 모니터링
- CloudWatch 메트릭 활성화
- 비용 알람 설정
- 쿼리 성능 모니터링

## 🔧 유지보수

### 인프라 업데이트
```bash
# 변경사항 확인
terraform plan

# 업데이트 적용
terraform apply
```

### 리소스 삭제
```bash
# 모든 리소스 삭제 (주의!)
terraform destroy
```

## 📈 모니터링 대시보드

### CloudWatch Metrics
- Firehose delivery success rate
- S3 PUT requests
- Athena query execution time
- Data scanned per query

### 권장 알람
- Firehose delivery failures > 5%
- Athena query cost > $10/day
- S3 storage cost > $50/month

## 🔐 보안 고려사항

### IAM 권한
- 최소 권한 원칙 적용
- Firehose 전용 IAM Role
- 애플리케이션별 권한 분리

### 데이터 암호화
- S3 서버 사이드 암호화 (AES256)
- Athena 쿼리 결과 암호화
- 전송 중 암호화 (HTTPS)

### 접근 제어
- S3 버킷 퍼블릭 액세스 차단
- Athena 워크그룹별 접근 제어
- CloudTrail 로깅 활성화

## 🆘 문제 해결

### 일반적인 이슈

1. **Firehose 전송 실패**
   - IAM 권한 확인
   - S3 버킷 정책 확인
   - CloudWatch 로그 검토

2. **Athena 쿼리 실패**
   - 파티션 키 누락 확인
   - 테이블 스키마 검증
   - 권한 확인

3. **파티션 생성 안됨**
   - 메타데이터 추출 설정 확인
   - JSON 형식 검증
   - Dynamic Partitioning 활성화 확인

### 로그 확인
```bash
# CloudWatch 로그 확인
aws logs describe-log-groups --log-group-name-prefix "/aws/kinesisfirehose"

# S3 오류 로그 확인
aws s3 ls s3://your-bucket/errors/ --recursive
```

## 📞 지원

문제가 발생하면 다음을 포함하여 이슈를 보고해주세요:
- 환경 (dev/staging/prod)
- 오류 메시지
- 관련 CloudWatch 로그
- 재현 단계 