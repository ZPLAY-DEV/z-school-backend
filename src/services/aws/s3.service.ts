import {
  DeleteObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.bucket =
      this.configService.get<string>('aws.bucketName') ?? 'z-school';
    this.region =
      this.configService.get<string>('aws.defaultRegion') ?? 'ap-northeast-2';
    // note that we don't, in fact, have to embed the credentials the way i did
    // in the following line. AWS library will pick them up from environment
    // variables automatically. (edit: removed the credentials part)
    // refer @https://stackoverflow.com/questions/68264237/how-to-set-credentials-in-aws-sdk-v3-javascript
    this.s3 = new S3Client({
      region: this.region,
    });
  }

  async upload(buffer: Buffer, path: string): Promise<any> {
    const bucketParams = {
      Bucket: this.bucket,
      Body: buffer,
      Key: path,
      ACL: ObjectCannedACL.private,
    };
    // upload the manipulated image to S3
    const command = new PutObjectCommand(bucketParams);
    await this.s3.send(command);
  }

  async delete(path: string): Promise<any> {
    // image processing using Jimp
    const bucketParams = {
      Bucket: this.bucket,
      Key: path.replace(`${process.env.AWS_CLOUDFRONT_URL}/`, ''),
    };
    // upload the manipulated image to S3
    const command = new DeleteObjectCommand(bucketParams);
    await this.s3.send(command);
  }

  async generateSignedUrl(path: string): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: path,
    };
    const command = new PutObjectCommand(params);
    return await getSignedUrl(this.s3, command, {
      expiresIn: 60 * 10, // for 10 mins
    });
  }
}
