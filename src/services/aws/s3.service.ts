import {
  DeleteObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface S3UploadResult {
  key: string;
  bucket: string;
  etag?: string;
}

export interface S3DeleteResult {
  success: boolean;
  key: string;
}

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.bucket = this.configService.get<string>('aws.bucketName') ?? 'zulu';
    this.region =
      this.configService.get<string>('aws.defaultRegion') ?? 'ap-northeast-2';

    this.s3 = new S3Client({
      region: this.region,
    });
  }

  onModuleInit() {
    try {
      this.logger.log(`AWS S3 service initialized w/ bucket: ${this.bucket}`);
    } catch (error) {
      console.error('❌ Failed to initialize AWS S3 service:', error);
    }
  }

  async upload(buffer: Buffer, path: string): Promise<S3UploadResult> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Buffer is empty or invalid');
    }

    if (!path || path.trim() === '') {
      throw new Error('Path is required and cannot be empty');
    }

    const bucketParams = {
      Bucket: this.bucket,
      Body: buffer,
      Key: path,
      ACL: ObjectCannedACL.private,
    };

    try {
      this.logger.log(`Uploading file to S3: ${path}`);
      const command = new PutObjectCommand(bucketParams);
      const result = await this.s3.send(command);

      this.logger.log(`Successfully uploaded file to S3: ${path}`);
      return {
        key: path,
        bucket: this.bucket,
        etag: result.ETag,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${path}`, error);
      if (error instanceof S3ServiceException) {
        throw new Error(`S3 upload failed: ${error.message}`);
      }
      throw new Error(`Unexpected error during S3 upload: ${error.message}`);
    }
  }

  async delete(path: string): Promise<S3DeleteResult> {
    if (!path || path.trim() === '') {
      throw new Error('Path is required and cannot be empty');
    }

    // CloudFront URL이 포함된 경우 key만 추출
    const key = path.replace(`${process.env.AWS_CLOUDFRONT_URL}/`, '');

    const bucketParams = {
      Bucket: this.bucket,
      Key: key,
    };

    try {
      this.logger.log(`Deleting file from S3: ${key}`);
      const command = new DeleteObjectCommand(bucketParams);
      await this.s3.send(command);

      this.logger.log(`Successfully deleted file from S3: ${key}`);
      return {
        success: true,
        key,
      };
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${key}`, error);
      if (error instanceof S3ServiceException) {
        throw new Error(`S3 delete failed: ${error.message}`);
      }
      throw new Error(`Unexpected error during S3 delete: ${error.message}`);
    }
  }

  async generateSignedUrl(
    path: string,
    expiresIn: number = 60 * 10, // 기본 10분
  ): Promise<string> {
    if (!path || path.trim() === '') {
      throw new Error('Path is required and cannot be empty');
    }

    if (expiresIn <= 0 || expiresIn > 60 * 60 * 24 * 7) {
      // 최대 7일
      throw new Error('ExpiresIn must be between 1 second and 7 days');
    }

    const params = {
      Bucket: this.bucket,
      Key: path,
    };

    try {
      this.logger.log(
        `Generating signed URL for: ${path}, expires in: ${expiresIn}s`,
      );
      const command = new PutObjectCommand(params);
      const signedUrl = await getSignedUrl(this.s3, command, { expiresIn });

      this.logger.log(`Successfully generated signed URL for: ${path}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for: ${path}`, error);
      if (error instanceof S3ServiceException) {
        throw new Error(`S3 signed URL generation failed: ${error.message}`);
      }
      throw new Error(
        `Unexpected error during signed URL generation: ${error.message}`,
      );
    }
  }

  // 헬퍼 메서드: 파일 존재 여부 확인
  async fileExists(path: string): Promise<boolean> {
    if (!path || path.trim() === '') {
      return false;
    }

    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });
      await this.s3.send(command);
      return true;
    } catch (error) {
      if (
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      this.logger.error(`Error checking file existence: ${path}`, error);
      throw new Error(`Failed to check file existence: ${error.message}`);
    }
  }

  // 설정값 getter 메서드들
  getBucket(): string {
    return this.bucket;
  }

  getRegion(): string {
    return this.region;
  }
}
