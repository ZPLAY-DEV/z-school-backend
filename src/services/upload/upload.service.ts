import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IS3Urls } from 'src/common/interfaces';
import { randomImageName } from 'src/helpers/random-filename';
import { S3Service } from 'src/services/aws/s3.service';

// 업로드 타입 정의
export enum UploadType {
  NEWS = 'news',
  BOARD = 'boards',
  AVATAR = 'avatar',
  POST = 'posts',
}

// 경로 빌더 인터페이스
export interface PathConfig {
  type: UploadType;
  entityId?: number;
  useEnvironment?: boolean;
}

// 업로드 옵션
export interface UploadOptions {
  expiresIn?: number; // seconds (default: 600)
  maxFileSize?: number; // bytes (default: 5MB)
}

// 파일 정보
export interface FileInfo {
  mimeType: string;
  entityName?: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly environment: string;
  private readonly cloudFrontUrl: string;

  // 기본 설정
  private readonly DEFAULT_EXPIRES_IN = 600; // 10분
  private readonly DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {
    this.environment = this.configService.get('nodeEnv', 'development');
    this.cloudFrontUrl = this.configService.get('aws.cloudFrontUrl', '');

    this.validateConfiguration();
    this.logger.log(
      `UploadService initialized for environment: ${this.environment}`,
    );
  }

  /**
   * 메인 업로드 URL 생성 메서드
   */
  async generateUploadUrls(
    pathConfig: PathConfig,
    fileInfo: FileInfo,
    options: UploadOptions = {},
  ): Promise<IS3Urls> {
    this.validateInputs(pathConfig, fileInfo);

    const path = this.buildPath(pathConfig, fileInfo);
    const finalOptions = this.mergeOptions(options);

    return await this.createSignedUrls(path, finalOptions);
  }

  /**
   * 파일 삭제
   */
  async deleteFile(imageUrl: string): Promise<boolean> {
    if (!this.isValidImageUrl(imageUrl)) {
      throw new Error('Invalid image URL provided');
    }

    try {
      const result = await this.s3Service.delete(imageUrl);
      this.logger.log(`Successfully deleted file: ${result.key}`);
      return result.success;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${imageUrl}`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * 파일 존재 여부 확인
   */
  async fileExists(imageUrl: string): Promise<boolean> {
    if (!this.isValidImageUrl(imageUrl)) {
      return false;
    }

    try {
      const path = this.extractPathFromUrl(imageUrl);
      return await this.s3Service.fileExists(path);
    } catch (error) {
      this.logger.error(`Failed to check file existence: ${imageUrl}`, error);
      return false;
    }
  }

  //* ---------------------------------------------------------------------- *//
  //* 편의 메서드들 (Convenience Methods)
  //* ---------------------------------------------------------------------- *//

  /**
   * 뉴스 이미지 URL 생성
   */
  async generateNewsImageUrls(
    newsId: number,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<IS3Urls> {
    return this.generateUploadUrls(
      { type: UploadType.NEWS, entityId: newsId },
      { mimeType, entityName: 'news' },
      options,
    );
  }

  /**
   * 게시판 이미지 URL 생성
   */
  async generateBoardImageUrls(
    mimeType: string,
    options?: UploadOptions,
  ): Promise<IS3Urls> {
    return this.generateUploadUrls(
      { type: UploadType.BOARD },
      { mimeType, entityName: 'board' },
      options,
    );
  }

  /**
   * 사용자 아바타 URL 생성
   */
  async generateUserAvatarUrls(
    userId: number,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<IS3Urls> {
    return this.generateUploadUrls(
      { type: UploadType.AVATAR, entityId: userId, useEnvironment: true },
      { mimeType, entityName: 'avatar' },
      options,
    );
  }

  /**
   * 사용자 포스트 이미지 URL 생성
   */
  async generateUserPostImageUrls(
    userId: number,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<IS3Urls> {
    return this.generateUploadUrls(
      { type: UploadType.POST, entityId: userId, useEnvironment: true },
      { mimeType, entityName: 'post' },
      options,
    );
  }

  //* ---------------------------------------------------------------------- *//
  //* Private Helper Methods
  //* ---------------------------------------------------------------------- *//

  private validateConfiguration(): void {
    if (!this.cloudFrontUrl) {
      this.logger.warn('AWS CloudFront URL is not configured');
    }
  }

  private validateInputs(pathConfig: PathConfig, fileInfo: FileInfo): void {
    if (!pathConfig?.type) {
      throw new Error('Upload type is required');
    }

    if (!fileInfo?.mimeType?.trim()) {
      throw new Error('MIME type is required');
    }

    if (pathConfig.entityId !== undefined && pathConfig.entityId <= 0) {
      throw new Error('Entity ID must be a positive number');
    }

    if (!this.isValidMimeType(fileInfo.mimeType)) {
      throw new Error(`Unsupported MIME type: ${fileInfo.mimeType}`);
    }
  }

  private buildPath(pathConfig: PathConfig, fileInfo: FileInfo): string {
    const pathSegments: string[] = [];

    // 환경 추가 (필요한 경우)
    if (pathConfig.useEnvironment) {
      pathSegments.push(this.environment);
    }

    // 타입별 경로 구성
    switch (pathConfig.type) {
      case UploadType.NEWS:
        pathSegments.push('news');
        if (pathConfig.entityId) {
          pathSegments.push(String(pathConfig.entityId));
        }
        break;

      case UploadType.BOARD:
        pathSegments.push('boards');
        break;

      case UploadType.AVATAR:
        if (pathConfig.entityId) {
          pathSegments.push(String(pathConfig.entityId));
        }
        break;

      case UploadType.POST:
        if (pathConfig.entityId) {
          pathSegments.push(String(pathConfig.entityId));
          pathSegments.push('posts');
        }
        break;

      default:
        throw new Error(
          'Unsupported upload type: ' + (pathConfig.type as string),
        );
    }

    // 랜덤 파일명 생성
    const entityName = fileInfo.entityName || pathConfig.type;
    const filename = randomImageName(entityName, fileInfo.mimeType);
    pathSegments.push(filename);

    return pathSegments.join('/');
  }

  private mergeOptions(options: UploadOptions) {
    return {
      expiresIn: options.expiresIn ?? this.DEFAULT_EXPIRES_IN,
      maxFileSize: options.maxFileSize ?? this.DEFAULT_MAX_FILE_SIZE,
    };
  }

  private async createSignedUrls(
    path: string,
    options: { expiresIn: number; maxFileSize: number },
  ): Promise<IS3Urls> {
    try {
      const uploadUrl = await this.s3Service.generateSignedUrl(
        path,
        options.expiresIn,
      );

      if (!this.cloudFrontUrl) {
        throw new Error('CloudFront URL is not configured');
      }

      const imageUrl = `${this.cloudFrontUrl}/${path}`;

      this.logger.log(`Generated upload URLs for path: ${path}`);
      return { uploadUrl, imageUrl };
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL for path: ${path}`,
        error,
      );
      throw new Error(`Failed to generate upload URLs: ${error.message}`);
    }
  }

  private isValidImageUrl(imageUrl: string): boolean {
    return !!(
      imageUrl?.trim() &&
      this.cloudFrontUrl &&
      imageUrl.includes(this.cloudFrontUrl)
    );
  }

  private extractPathFromUrl(imageUrl: string): string {
    return imageUrl.replace(`${this.cloudFrontUrl}/`, '');
  }

  private isValidMimeType(mimeType: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    return allowedTypes.includes(mimeType.toLowerCase());
  }

  //* ---------------------------------------------------------------------- *//
  //* Public Getter Methods
  //* ---------------------------------------------------------------------- *//

  getEnvironment(): string {
    return this.environment;
  }

  getCloudFrontUrl(): string {
    return this.cloudFrontUrl;
  }

  getSupportedMimeTypes(): string[] {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  }
}
