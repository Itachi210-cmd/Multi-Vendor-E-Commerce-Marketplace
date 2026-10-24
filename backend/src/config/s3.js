import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { env } from './env.js';

/**
 * Configure S3 Client
 * Supports standard AWS S3 or S3-compatible endpoints like MinIO
 */
const s3Config = {
  region: env.aws.region,
};

// If credentials provided
if (env.aws.accessKeyId && env.aws.secretAccessKey) {
  s3Config.credentials = {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  };
}

// Custom endpoint for MinIO / Local development
if (env.aws.endpoint) {
  s3Config.endpoint = env.aws.endpoint;
  s3Config.forcePathStyle = env.aws.forcePathStyle || true;
}

export const s3Client = new S3Client(s3Config);

/**
 * Generate public file URL based on configuration
 * Works with MinIO (path style), AWS S3 virtual hosted, or custom CDN/public URL
 */
export const getPublicFileUrl = (key) => {
  if (env.aws.publicUrl) {
    // If S3_PUBLIC_URL ends without bucket
    const base = env.aws.publicUrl.replace(/\/+$/, '');
    return `${base}/${env.aws.bucket}/${key}`;
  }

  if (env.aws.endpoint) {
    const base = env.aws.endpoint.replace(/\/+$/, '');
    return `${base}/${env.aws.bucket}/${key}`;
  }

  // Real AWS S3 virtual hosted style
  return `https://${env.aws.bucket}.s3.${env.aws.region}.amazonaws.com/${key}`;
};

/**
 * Sanitize filename to avoid directory traversal or special characters
 */
export const sanitizeFileName = (fileName) => {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-');
};

/**
 * Generate a presigned PUT URL for browser uploads
 * @param {Object} params
 * @param {string} params.fileName
 * @param {string} params.contentType
 * @param {string} params.folder ('products' | 'vendors')
 * @param {string} params.vendorId
 * @returns {Promise<{ uploadUrl: string, fileUrl: string, key: string }>}
 */
export const createPresignedUploadUrl = async ({ fileName, contentType, folder, vendorId }) => {
  const sanitized = sanitizeFileName(fileName);
  const uniqueId = crypto.randomUUID();
  const key = `${folder}/${vendorId}/${uniqueId}-${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: env.aws.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
  const fileUrl = getPublicFileUrl(key);

  return {
    uploadUrl,
    fileUrl,
    key,
  };
};

export const s3Service = {
  createPresignedUploadUrl,
  getPublicFileUrl,
};

export default s3Client;
