import { env } from '../../config/env.js';

export interface S3UploadParams {
  bucket: string;
  key: string;
  contentType: string;
  expiresSeconds: number;
}

export interface S3PresignedUrlResult {
  url: string;
  expiresAt: Date;
}

export class S3Service {
  async createPresignedPutUrl(params: S3UploadParams): Promise<S3PresignedUrlResult> {
    const { bucket, key, expiresSeconds } = params;

    const expiresAt = new Date(Date.now() + expiresSeconds * 1000);

    return {
      url: `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}?X-Amz-Expires=${expiresSeconds}`,
      expiresAt,
    };
  }
}

export const s3Service = new S3Service();
