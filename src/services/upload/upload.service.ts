import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { S3Urls } from 'src/common/types';
import { IS3Urls } from 'src/common/interfaces';
import { randomImageName } from 'src/helpers/random-filename';
import { S3Service } from 'src/services/aws/s3.service';

export interface GenerateUrlsOptions {
  expiresIn?: number; // seconds
  validatePath?: boolean;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly env: string;
  private readonly cloudFrontUrl: string;

  constructor(
    @Inject(ConfigService) private configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {
    this.env = this.configService.get('nodeEnv') || 'development';
    this.cloudFrontUrl = this.configService.get('aws.cloudFrontUrl') || '';

    if (!this.cloudFrontUrl) {
      this.logger.warn('AWS CloudFront URL is not configured');
    }

    this.logger.log(`UploadService initialized for environment: ${this.env}`);
  }

  async generateImageUrls(
    paths: string[],
    files: string[],
    options: GenerateUrlsOptions = {},
  ): Promise<IS3Urls> {
    if (!paths || paths.length === 0) {
      throw new Error('Paths array cannot be empty');
    }

    if (!files || files.length < 2) {
      throw new Error('Files array must contain at least [entity, mimeType]');
    }

    const [entity, mime] = files;

    if (!entity || !mime) {
      throw new Error('Both entity and mimeType are required');
    }

    try {
      const path = this._getPath(paths, randomImageName(entity, mime));
      return await this._generateSignedUrlWithImageUrl(path, options);
    } catch (error) {
      this.logger.error(
        `Failed to generate image URLs for entity: ${entity}`,
        error,
      );
      throw new Error(`Failed to generate image URLs: ${error.message}`);
    }
  }

  private async _generateSignedUrlWithImageUrl(
    path: string,
    options: GenerateUrlsOptions = {},
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

      this.logger.log(`Generated URLs for path: ${path}`);
      return { uploadUrl, imageUrl };
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL for path: ${path}`,
        error,
      );
      throw error;
    }
  }

  private _getPath(paths: string[], filename: string): string {
    // 빈 문자열이나 null 값들을 필터링
    const cleanPaths = paths.filter((p) => p && p.trim() !== '');

    if (cleanPaths.length === 0) {
      throw new Error('At least one valid path is required');
    }

    if (!filename || filename.trim() === '') {
      throw new Error('Filename is required');
    }

    return cleanPaths.join('/') + `/${filename.trim()}`;
  }

  // 파일 삭제 기능 추가
  async deleteFile(imageUrl: string): Promise<boolean> {
    try {
      if (!imageUrl || !imageUrl.includes(this.cloudFrontUrl)) {
        throw new Error('Invalid image URL provided');
      }

      const result = await this.s3Service.delete(imageUrl);
      this.logger.log(`Successfully deleted file: ${result.key}`);
      return result.success;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${imageUrl}`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // 파일 존재 여부 확인
  async checkFileExists(imageUrl: string): Promise<boolean> {
    try {
      if (!imageUrl || !imageUrl.includes(this.cloudFrontUrl)) {
        return false;
      }

      const path = imageUrl.replace(`${this.cloudFrontUrl}/`, '');
      return await this.s3Service.fileExists(path);
    } catch (error) {
      this.logger.error(`Failed to check file existence: ${imageUrl}`, error);
      return false;
    }
  }

  //* ---------------------------------------------------------------------- *//
  //* Convenience methods for specific entity types
  //* ---------------------------------------------------------------------- *//

  async generateNewsImageUrls(
    id: number,
    mimeType: string,
    options?: GenerateUrlsOptions,
  ): Promise<IS3Urls> {
    if (!id || id <= 0) {
      throw new Error('Valid news ID is required');
    }

    if (!mimeType || mimeType.trim() === '') {
      throw new Error('MIME type is required');
    }

    return this.generateImageUrls(
      [`news`, `${id}`],
      [`news`, mimeType],
      options,
    );
  }

  async generateBoardImageUrls(
    mimeType: string,
    options?: GenerateUrlsOptions,
  ): Promise<IS3Urls> {
    if (!mimeType || mimeType.trim() === '') {
      throw new Error('MIME type is required');
    }

    return this.generateImageUrls([`boards`], [`boards`, mimeType], options);
  }

  async generateUserAvatarUrls(
    userId: number,
    mimeType: string,
    options?: GenerateUrlsOptions,
  ): Promise<IS3Urls> {
    if (!userId || userId <= 0) {
      throw new Error('Valid user ID is required');
    }

    if (!mimeType || mimeType.trim() === '') {
      throw new Error('MIME type is required');
    }

    return this.generateImageUrls(
      [this.env, `${userId}`],
      [`avatar`, mimeType],
      options,
    );
  }

  async generateStudentImageUrls(
    userId: number,
    mimeType: string,
    options?: GenerateUrlsOptions,
  ): Promise<IS3Urls> {
    if (!userId || userId <= 0) {
      throw new Error('Valid user ID is required');
    }

    if (!mimeType || mimeType.trim() === '') {
      throw new Error('MIME type is required');
    }

    return this.generateImageUrls(
      [this.env, `${userId}`],
      [`student`, mimeType],
      options,
    );
  }

  async generateUserPostImageUrls(
    userId: number,
    mimeType: string,
    options?: GenerateUrlsOptions,
  ): Promise<IS3Urls> {
    if (!userId || userId <= 0) {
      throw new Error('Valid user ID is required');
    }

    if (!mimeType || mimeType.trim() === '') {
      throw new Error('MIME type is required');
    }

    return this.generateImageUrls(
      [this.env, `${userId}`, 'posts'],
      [`image`, mimeType],
      options,
    );
  }

  // 헬퍼 메서드들
  getEnvironment(): string {
    return this.env;
  }

  getCloudFrontUrl(): string {
    return this.cloudFrontUrl;
  }
}
