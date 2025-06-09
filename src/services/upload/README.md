# UploadService

AWS S3와 CloudFront를 활용한 이미지 업로드 서비스입니다.

## 🚀 주요 기능

- **Signed URL 생성**: S3 직접 업로드용 임시 URL
- **CloudFront URL**: 업로드 후 접근 가능한 CDN URL  
- **타입 안전성**: Enum과 인터페이스 기반 구조
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

### 편의 메서드 (권장)

```typescript
// 뉴스 이미지
const urls = await uploadService.generateNewsImageUrls(123, 'image/jpeg');

// 게시판 이미지  
const urls = await uploadService.generateBoardImageUrls('image/png');

// 사용자 아바타
const urls = await uploadService.generateUserAvatarUrls(456, 'image/jpeg');

// 사용자 포스트
const urls = await uploadService.generateUserPostImageUrls(789, 'image/webp');
```

### 커스텀 업로드

```typescript
import { UploadType } from 'src/services/upload/upload.service';

const urls = await uploadService.generateUploadUrls(
  { 
    type: UploadType.NEWS, 
    entityId: 123,
    useEnvironment: true 
  },
  { 
    mimeType: 'image/jpeg',
    entityName: 'news' 
  },
  { 
    expiresIn: 1800 // 30분
  }
);
```

## 📤 업로드 플로우

```typescript
// 1. 백엔드에서 URL 생성
const { uploadUrl, imageUrl } = await uploadService.generateNewsImageUrls(123, 'image/jpeg');

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
  maxFileSize?: number;  // 파일 크기 제한 (바이트, 기본: 5MB)
}
```

## 🗂️ 생성되는 경로 구조

```
news/{id}/random-filename.jpg           // 뉴스 이미지
boards/random-filename.png              // 게시판 이미지  
{env}/{userId}/random-filename.jpg      // 사용자 아바타
{env}/{userId}/posts/random-filename.webp // 사용자 포스트
```

## 🔧 환경 설정

```bash
# .env
AWS_DEFAULT_REGION=ap-northeast-2
AWS_S3_BUCKET=your-bucket-name
AWS_CLOUDFRONT_URL=https://your-cloudfront-domain.com
NODE_ENV=development
```

## 📄 지원 MIME 타입

- `image/jpeg`, `image/jpg`
- `image/png` 
- `image/gif`
- `image/webp`

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
    return this.uploadService.generateNewsImageUrls(id, mimeType);
  }
}
```

## 🐛 에러 처리

```typescript
try {
  const urls = await uploadService.generateNewsImageUrls(id, mimeType);
} catch (error) {
  // 'Upload type is required'
  // 'MIME type is required'  
  // 'Entity ID must be a positive number'
  // 'Unsupported MIME type: ...'
  // 'CloudFront URL is not configured'
}
``` 