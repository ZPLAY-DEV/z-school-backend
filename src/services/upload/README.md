# UploadService 사용 가이드

## 📋 개요

`UploadService`는 AWS S3와 CloudFront를 활용한 파일 업로드 관리를 위한 서비스입니다. 이미지 업로드를 위한 Signed URL 생성, 파일 삭제, 존재 여부 확인 등의 기능을 제공합니다.

## 🏗️ 아키텍처

```
UploadService
├── S3Service (저수준 AWS S3 작업)
├── ConfigService (설정 관리)
└── CloudFront (CDN 이미지 서빙)
```

## 🚀 주요 기능

### 1. 이미지 URL 생성
- **Signed URL**: S3에 직접 업로드할 수 있는 임시 URL
- **Image URL**: 업로드 후 접근 가능한 CloudFront URL

### 2. 엔티티별 편의 메서드
- 뉴스 이미지
- 게시판 이미지  
- 사용자 아바타
- 학생 이미지
- 사용자 포스트 이미지

### 3. 파일 관리
- 파일 삭제
- 파일 존재 여부 확인

## 📚 API 문서

### 기본 메서드

#### `generateImageUrls(paths, files, options?)`

기본적인 이미지 URL 생성 메서드입니다.

**파라미터:**
- `paths: string[]` - S3 경로 배열 (예: `['news', '123']`)
- `files: string[]` - `[entity, mimeType]` 형태의 배열
- `options?: GenerateUrlsOptions` - 선택적 옵션

**반환값:** `Promise<IS3Urls>`
```typescript
{
  uploadUrl: string;  // S3 업로드용 Signed URL
  imageUrl: string;   // CloudFront 접근용 URL
}
```

**예제:**
```typescript
const urls = await uploadService.generateImageUrls(
  ['news', '123'], 
  ['news', 'image/jpeg'],
  { expiresIn: 600 } // 10분
);

console.log(urls.uploadUrl);  // S3 업로드 URL
console.log(urls.imageUrl);   // CloudFront 이미지 URL
```

### 편의 메서드

#### `generateNewsImageUrls(id, mimeType, options?)`

뉴스 이미지용 URL 생성

```typescript
const urls = await uploadService.generateNewsImageUrls(
  123, 
  'image/jpeg'
);
// 경로: news/123/random-filename.jpg
```

#### `generateBoardImageUrls(mimeType, options?)`

게시판 이미지용 URL 생성

```typescript
const urls = await uploadService.generateBoardImageUrls('image/png');
// 경로: boards/random-filename.png
```

#### `generateUserAvatarUrls(userId, mimeType, options?)`

사용자 아바타용 URL 생성

```typescript
const urls = await uploadService.generateUserAvatarUrls(
  456, 
  'image/jpeg'
);
// 경로: {환경}/{userId}/random-filename.jpg
```

#### `generateStudentImageUrls(userId, mimeType, options?)`

학생 이미지용 URL 생성

```typescript
const urls = await uploadService.generateStudentImageUrls(
  789, 
  'image/png'
);
// 경로: {환경}/{userId}/random-filename.png
```

#### `generateUserPostImageUrls(userId, mimeType, options?)`

사용자 포스트 이미지용 URL 생성

```typescript
const urls = await uploadService.generateUserPostImageUrls(
  321, 
  'image/webp'
);
// 경로: {환경}/{userId}/posts/random-filename.webp
```

### 파일 관리 메서드

#### `deleteFile(imageUrl)`

파일 삭제

```typescript
const success = await uploadService.deleteFile(
  'https://cdn.example.com/news/123/image.jpg'
);
console.log(success); // true/false
```

#### `checkFileExists(imageUrl)`

파일 존재 여부 확인

```typescript
const exists = await uploadService.checkFileExists(
  'https://cdn.example.com/news/123/image.jpg'
);
console.log(exists); // true/false
```

## ⚙️ 설정 옵션

### GenerateUrlsOptions

```typescript
interface GenerateUrlsOptions {
  expiresIn?: number;     // Signed URL 만료시간 (초, 기본값: 600)
  validatePath?: boolean; // 경로 유효성 검사 (향후 확장용)
}
```

**사용 예제:**
```typescript
const options: GenerateUrlsOptions = {
  expiresIn: 1800 // 30분
};

const urls = await uploadService.generateNewsImageUrls(
  123, 
  'image/jpeg', 
  options
);
```

## 🎯 사용 패턴

### 1. 컨트롤러에서 Signed URL 생성

```typescript
@Controller('news')
export class NewsController {
  constructor(private readonly uploadService: UploadService) {}

  @Post(':id/upload-url')
  async generateUploadUrl(
    @Param('id') id: number,
    @Body('mimeType') mimeType: string
  ) {
    return this.uploadService.generateNewsImageUrls(id, mimeType);
  }
}
```

### 2. 프론트엔드 업로드 플로우

```typescript
// 1. 백엔드에서 Signed URL 받기
const { uploadUrl, imageUrl } = await fetch('/api/news/123/upload-url', {
  method: 'POST',
  body: JSON.stringify({ mimeType: 'image/jpeg' })
}).then(res => res.json());

// 2. S3에 직접 업로드
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileBuffer,
  headers: { 'Content-Type': 'image/jpeg' }
});

// 3. 성공 후 imageUrl을 DB에 저장
await fetch('/api/news/123', {
  method: 'PATCH',
  body: JSON.stringify({ imageUrl })
});
```

### 3. 파일 정리 작업

```typescript
// 기존 이미지 삭제 후 새 이미지 등록
if (existingImageUrl) {
  await uploadService.deleteFile(existingImageUrl);
}

const newUrls = await uploadService.generateNewsImageUrls(id, mimeType);
```

## 🔍 에러 처리

### 일반적인 에러 상황

```typescript
try {
  const urls = await uploadService.generateNewsImageUrls(id, mimeType);
} catch (error) {
  if (error.message.includes('Valid news ID is required')) {
    // ID 유효성 검사 실패
  } else if (error.message.includes('MIME type is required')) {
    // MIME 타입 누락
  } else if (error.message.includes('CloudFront URL is not configured')) {
    // 설정 오류
  }
}
```

### 로깅

모든 작업은 자동으로 로깅됩니다:

```
[UploadService] Generated URLs for path: news/123/random-filename.jpg
[UploadService] Successfully deleted file: news/123/old-image.jpg
[UploadService] Failed to check file existence: https://cdn.example.com/invalid.jpg
```

## 🔧 환경 설정

### 필수 환경 변수

```bash
# AWS 설정
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your-bucket-name
AWS_CLOUDFRONT_URL=https://your-cloudfront-domain.com

# 애플리케이션 환경
NODE_ENV=development|staging|production
```

### ConfigService 설정

```typescript
// config/aws.config.ts
export default {
  bucketName: process.env.AWS_S3_BUCKET,
  defaultRegion: process.env.AWS_REGION,
  cloudFrontUrl: process.env.AWS_CLOUDFRONT_URL,
};
```

## 🛡️ 보안 고려사항

### 1. Signed URL 만료시간
- 기본값: 10분 (600초)
- 최대값: 7일
- 권장: 업로드 작업에 충분한 시간 설정

### 2. 파일 경로 보안
- 환경별 디렉토리 분리
- 사용자 ID 기반 접근 제어
- 랜덤 파일명 생성

### 3. MIME 타입 검증
```typescript
// 향후 확장 예정
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
```

## 🧪 테스트

### 단위 테스트 예제

```typescript
describe('UploadService', () => {
  let service: UploadService;
  let s3Service: jest.Mocked<S3Service>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: S3Service, useValue: mockS3Service },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it('should generate news image URLs', async () => {
    const result = await service.generateNewsImageUrls(123, 'image/jpeg');
    
    expect(result.uploadUrl).toContain('amazonaws.com');
    expect(result.imageUrl).toContain('cloudfront.net');
  });
});
```

## 📊 모니터링

### 로그 레벨
- `LOG`: 정상 작업
- `WARN`: 설정 누락 등 주의사항
- `ERROR`: 실패한 작업

### 메트릭 추적 (권장)
- 업로드 요청 수
- 성공/실패 비율
- 평균 응답 시간
- 파일 크기 분포

## 🔄 마이그레이션 가이드

### v1에서 v2로 업그레이드

#### 변경사항
1. 모든 메서드에 `options` 파라미터 추가
2. 강화된 에러 핸들링
3. 새로운 유틸리티 메서드 추가

#### 기존 코드 호환성
```typescript
// 기존 코드 (계속 작동)
const urls = await uploadService.generateNewsImageUrls(123, 'image/jpeg');

// 새로운 옵션 활용
const urls = await uploadService.generateNewsImageUrls(
  123, 
  'image/jpeg', 
  { expiresIn: 1800 }
);
```

## 📞 지원

문제가 발생하거나 기능 요청이 있는 경우:
1. 로그를 확인하여 구체적인 에러 메시지 파악
2. 환경 설정 검증
3. 개발팀에 문의

---

**마지막 업데이트:** 2024년
**버전:** 2.0.0 