import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import logger from './logger';

export function isCloudinaryConfigured(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  return Boolean(cloudName && apiKey && apiSecret);
}

export function initCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    logger.info(`☁️ Cloudinary initialized with cloud_name: ${cloudName}`);
  } else {
    logger.warn('⚠️ Cloudinary credentials missing or incomplete in .env. Uploads will use local static storage fallback.');
  }
}

export interface UploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  isLocalFallback?: boolean;
}

/**
 * Upload a Buffer to Cloudinary (or local fallback if Cloudinary is not configured)
 */
export async function uploadBuffer(
  buffer: Buffer,
  options: { folder?: string; filename?: string; mimeType?: string } = {}
): Promise<UploadResult> {
  const folder = options.folder || 'hiai-menugo';

  if (isCloudinaryConfigured()) {
    initCloudinary();
    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, any> = {
        folder,
        resource_type: 'image',
      };
      if (options.filename) {
        uploadOptions.public_id = path.parse(options.filename).name.replace(/[^a-zA-Z0-9-_]/g, '_');
      }

      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error || !result) {
          logger.error('Cloudinary upload_stream error:', { error });
          return reject(error || new Error('Upload to Cloudinary failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
          isLocalFallback: false,
        });
      });

      stream.end(buffer);
    });
  }

  // Local storage fallback
  return saveLocally(buffer, options);
}

/**
 * Upload Base64 Data URI to Cloudinary (or local fallback)
 */
export async function uploadBase64(
  base64Data: string,
  options: { folder?: string; filename?: string; mimeType?: string } = {}
): Promise<UploadResult> {
  const folder = options.folder || 'hiai-menugo';

  if (isCloudinaryConfigured()) {
    initCloudinary();
    try {
      const result = await cloudinary.uploader.upload(base64Data, {
        folder,
        resource_type: 'image',
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
        isLocalFallback: false,
      };
    } catch (error) {
      logger.error('Cloudinary base64 upload error:', { error });
      throw error;
    }
  }

  // Parse base64 to buffer
  const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    return saveLocally(buffer, { ...options, mimeType });
  }

  const rawBuffer = Buffer.from(base64Data, 'base64');
  return saveLocally(rawBuffer, options);
}

function saveLocally(
  buffer: Buffer,
  options: { filename?: string; mimeType?: string }
): UploadResult {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  let ext = '.jpg';
  if (options.mimeType) {
    if (options.mimeType.includes('png')) ext = '.png';
    else if (options.mimeType.includes('webp')) ext = '.webp';
    else if (options.mimeType.includes('gif')) ext = '.gif';
    else if (options.mimeType.includes('svg')) ext = '.svg';
  } else if (options.filename) {
    ext = path.extname(options.filename) || '.jpg';
  }

  const uniqueName = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(uploadsDir, uniqueName);
  fs.writeFileSync(filePath, buffer);

  const port = process.env.PORT || 5000;
  const baseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${port}`;
  const localUrl = `${baseUrl}/uploads/${uniqueName}`;

  logger.warn(`[Upload Fallback] Saved locally: ${localUrl}`);

  return {
    url: localUrl,
    publicId: uniqueName,
    bytes: buffer.length,
    format: ext.replace('.', ''),
    isLocalFallback: true,
  };
}

export default {
  isCloudinaryConfigured,
  initCloudinary,
  uploadBuffer,
  uploadBase64,
};
