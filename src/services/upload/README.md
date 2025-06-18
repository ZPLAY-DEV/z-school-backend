# UploadService

AWS S3와 CloudFront를 활용한 파일 업로드 서비스입니다.

## 🚀 주요 기능

- **Signed URL 생성**: S3 직접 업로드용 임시 URL
- **CloudFront URL**: 업로드 후 접근 가능한 CDN URL  
- **경로 기반 구조**: 사용자 정의 경로로 파일 구조 관리
- **파일 관리**: 삭제, 존재 여부 확인

## 📦 설치

```typescript
import { UploadModule } from 'src/services/upload/upload.module';

@Module({
  imports: [UploadModule],
})
export class YourModule {}
```

## 💻 기본 사용법

### 메인 업로드 메서드

```typescript
// 뉴스 이미지 업로드
const urls = await uploadService.generateUploadUrls(
  'news/123',
  'image/jpeg'
);

// 게시판 이미지 업로드
const urls = await uploadService.generateUploadUrls(
  'boards',
  'image/png'
);

// 사용자 아바타 업로드
const urls = await uploadService.generateUploadUrls(
  'users/456/avatar',
  'image/jpeg'
);

// 사용자 포스트 이미지 업로드
const urls = await uploadService.generateUploadUrls(
  'users/789/posts',
  'image/webp'
);

// PDF 문서 업로드
const urls = await uploadService.generateUploadUrls(
  'documents/contracts',
  'application/pdf'
);
```

### 옵션 사용

```typescript
const urls = await uploadService.generateUploadUrls(
  'news/123',
  'image/jpeg',
  { 
    expiresIn: 1800 // 30분
  }
);
```

## 📤 업로드 플로우

```typescript
// 1. 백엔드에서 URL 생성
const { uploadUrl, imageUrl } = await uploadService.generateUploadUrls(
  'news/123',
  'image/jpeg'
);

// 2. 프론트엔드에서 S3 업로드
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileBuffer,
  headers: { 'Content-Type': 'image/jpeg' }
});

// 3. imageUrl을 DB에 저장
await newsService.updateImage(123, imageUrl);
```

## 🗂️ 파일 관리

```typescript
// 파일 삭제
const success = await uploadService.deleteFile(imageUrl);

// 파일 존재 확인
const exists = await uploadService.fileExists(imageUrl);
```

## ⚙️ 옵션

```typescript
interface UploadOptions {
  expiresIn?: number;    // Signed URL 만료시간 (초, 기본: 600)
}
```

## 🗂️ 생성되는 경로 구조

```
{env}/{path}/random-filename.jpg

예시:
development/news/123/file-abc123.jpg           // 뉴스 이미지
development/boards/file-def456.png             // 게시판 이미지  
development/users/456/avatar/file-ghi789.jpg   // 사용자 아바타
development/users/789/posts/file-jkl012.webp  // 사용자 포스트
development/documents/contracts/file-mno345.pdf // PDF 문서
```

## 🔧 LocalStack 설정

```bash
# to verify s3 bucket list
awslocal s3 ls
# to create s3 bucket
aws --endpoint-url=http://localhost:4566 s3 mb s3://afterschool-files-bucket
```

## 📄 지원 파일 타입

- `image/jpeg`, `image/jpg`
- `image/png` 
- `image/gif`
- `image/webp`
- `application/pdf`

## 🎯 컨트롤러 예제

```typescript
@Controller('news')
export class NewsController {
  constructor(private readonly uploadService: UploadService) {}

  @Post(':id/upload-url')
  async getUploadUrl(
    @Param('id') id: number,
    @Body('mimeType') mimeType: string
  ) {
    return this.uploadService.generateUploadUrls(
      `news/${id}`,
      mimeType
    );
  }
}
```

## 🐛 에러 처리

```typescript
try {
  const urls = await uploadService.generateUploadUrls('news/123', mimeType);
} catch (error) {
  // 'Unsupported MIME type: ...'
  // 'CloudFront URL is not configured'
  // 'Failed to generate upload URLs: ...'
  // 'Invalid image URL provided'
  // 'Failed to delete file: ...'
}
```

## 📋 주요 변경사항 (이전 버전 대비)

- **단순화된 API**: 하나의 메인 메서드 `generateUploadUrls()`로 통일
- **경로 기반**: 사용자가 직접 경로를 지정하여 더 유연한 파일 구조 관리
- **PDF 지원**: 이미지 외 PDF 파일 업로드 지원
- **편의 메서드 제거**: 특정 타입별 메서드들이 제거되어 더 범용적으로 사용 가능 