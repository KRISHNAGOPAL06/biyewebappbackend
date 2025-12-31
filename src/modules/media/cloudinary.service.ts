import { env } from '../../config/env.js';

export interface CloudinaryUploadParams {
  publicId: string;
  folder: string;
  maxBytes: number;
}

export interface CloudinaryUploadResult {
  uploadUrl: string;
  uploadParams: {
    api_key: string;
    timestamp: number;
    signature: string;
    folder: string;
    public_id: string;
  };
}

export class CloudinaryService {
  async createSignedUploadParams(params: CloudinaryUploadParams): Promise<CloudinaryUploadResult> {
    const { publicId, folder } = params;

    const timestamp = Math.floor(Date.now() / 1000);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`;

    return {
      uploadUrl,
      uploadParams: {
        api_key: env.CLOUDINARY_API_KEY || '',
        timestamp,
        signature: 'placeholder_signature_generated_via_cloudinary_sdk',
        folder,
        public_id: publicId,
      },
    };
  }
}

export const cloudinaryService = new CloudinaryService();
