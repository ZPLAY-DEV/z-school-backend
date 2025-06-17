import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IS3Urls } from 'src/common/interfaces';
import { randomImageName } from 'src/helpers/random-filename';
import { S3Service } from 'src/services/aws/s3.service';

// 업로드 옵션 (단순화)
export interface UploadOptions {
  expiresIn?: number; // seconds (default: 600)
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly environment: string;
  private readonly cloudFrontUrl: string;
  private readonly DEFAULT_EXPIRES_IN = 600; // 10분

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {
    this.environment = this.configService.get('nodeEnv', 'development');
    this.cloudFrontUrl = this.configService.get('aws.cloudFrontUrl', '');

    if (!this.cloudFrontUrl) {
      this.logger.warn('AWS CloudFront URL is not configured');
    }

    this.logger.log(
      `UploadService initialized for environment: ${this.environment}`,
    );
  }

  /**
   * 메인 업로드 URL 생성 메서드 (경로 기반)
   */
  async generateUploadUrls(
    path: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<IS3Urls> {
    if (!this.isValidMimeType(mimeType)) {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }

    const filename = randomImageName('file', mimeType);
    const fullPath = `${this.environment}/${path}/${filename}`;
    const expiresIn = options?.expiresIn ?? this.DEFAULT_EXPIRES_IN;

    try {
      const uploadUrl = await this.s3Service.generateSignedUrl(
        fullPath,
        expiresIn,
      );

      if (!this.cloudFrontUrl) {
        throw new Error('CloudFront URL is not configured');
      }

      const imageUrl = `${this.cloudFrontUrl}/${fullPath}`;

      this.logger.log(`Generated upload URLs for path: ${fullPath}`);
      return { uploadUrl, imageUrl };
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL for path: ${fullPath}`,
        error,
      );
      throw new Error(`Failed to generate upload URLs: ${error.message}`);
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(url: string): Promise<boolean> {
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid image URL provided');
    }

    try {
      const path = this.extractPathFromUrl(url);
      const result = await this.s3Service.delete(path);
      this.logger.log(`Successfully deleted file: ${result.key}`);
      return result.success;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${url}`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * 파일 존재 여부 확인
   */
  async fileExists(url: string): Promise<boolean> {
    if (!this.isValidUrl(url)) {
      return false;
    }

    try {
      const path = this.extractPathFromUrl(url);
      return await this.s3Service.fileExists(path);
    } catch (error) {
      this.logger.error(`Failed to check file existence: ${url}`, error);
      return false;
    }
  }

  //* ---------------------------------------------------------------------- *//
  //* Private Helper Methods
  //* ---------------------------------------------------------------------- *//

  private isValidUrl(url: string): boolean {
    return !!(
      url?.trim() &&
      this.cloudFrontUrl &&
      url.includes(this.cloudFrontUrl)
    );
  }

  private extractPathFromUrl(url: string): string {
    return url.replace(`${this.cloudFrontUrl}/`, '');
  }

  private isValidMimeType(mimeType: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    return allowedTypes.includes(mimeType.toLowerCase());
  }
}
