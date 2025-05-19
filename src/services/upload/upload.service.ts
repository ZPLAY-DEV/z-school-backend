import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { S3Urls } from 'src/common/types';
import { IS3Urls } from 'src/common/interfaces';
import { randomImageName } from 'src/helpers/random-filename';
import { S3Service } from 'src/services/aws/s3.service';

@Injectable()
export class UploadService {
  private readonly env: any;

  constructor(
    @Inject(ConfigService) private configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {
    this.env = this.configService.get('nodeEnv');
  }

  async generateImageUrls(paths: string[], files: string[]): Promise<IS3Urls> {
    const [entity, mime] = files;
    const path = this._getPath(paths, randomImageName(entity, mime));
    return this._generateSignedUrlWithImageUrl(path);
  }

  private async _generateSignedUrlWithImageUrl(path: string): Promise<IS3Urls> {
    const uploadUrl = await this.s3Service.generateSignedUrl(path);
    const imageUrl = `${this.configService.get('aws.cloudFrontUrl')}/${path}`;
    return { uploadUrl, imageUrl };
  }

  private _getPath(paths: string[], filename: string): string {
    return paths.join('/') + `/${filename}`;
  }

  //* ---------------------------------------------------------------------- *//
  //* Convenience methods for specific entity types
  //* ---------------------------------------------------------------------- *//

  async generateNewsImageUrls(id: number, mimeType: string): Promise<IS3Urls> {
    return this.generateImageUrls([`news`, `${id}`], [`news`, mimeType]);
  }

  async generateBoardImageUrls(mimeType: string): Promise<IS3Urls> {
    return this.generateImageUrls([`boards`], [`boards`, mimeType]);
  }

  async generateUserAvatarUrls(
    userId: number,
    mimeType: string,
  ): Promise<IS3Urls> {
    return this.generateImageUrls(
      [this.env, `${userId}`] as string[],
      [`avatar`, mimeType] as string[],
    );
  }

  async generateStudentImageUrls(
    userId: number,
    mimeType: string,
  ): Promise<IS3Urls> {
    return this.generateImageUrls(
      [this.env, `${userId}`] as string[],
      [`student`, mimeType] as string[],
    );
  }

  async generateUserPostImageUrls(
    userId: number,
    mimeType: string,
  ): Promise<IS3Urls> {
    return this.generateImageUrls(
      [this.env, `${userId}`, 'posts'] as string[],
      [`image`, mimeType],
    );
  }
}
