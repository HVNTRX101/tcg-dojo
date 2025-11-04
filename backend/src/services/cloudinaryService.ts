import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env';
import sharp from 'sharp';
import streamifier from 'streamifier';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export interface ImageUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Upload an image to Cloudinary
 * @param buffer - Image buffer
 * @param folder - Folder path in Cloudinary
 * @param options - Additional upload options
 * @returns Upload result with URL and public ID
 */
export const uploadImage = async (
  buffer: Buffer,
  folder: string = config.cloudinary.folder,
  options: any = {}
): Promise<ImageUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        quality: 'auto:good',
        fetch_format: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error('Failed to upload image to Cloudinary'));
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
          });
        } else {
          reject(new Error('No result from Cloudinary upload'));
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Optimize and upload an image
 * Resizes to max dimensions while maintaining aspect ratio
 * @param buffer - Original image buffer
 * @param folder - Folder path in Cloudinary
 * @param maxWidth - Maximum width (default 2000)
 * @param maxHeight - Maximum height (default 2000)
 * @returns Upload result
 */
export const optimizeAndUploadImage = async (
  buffer: Buffer,
  folder: string = config.cloudinary.folder,
  maxWidth: number = 2000,
  maxHeight: number = 2000
): Promise<ImageUploadResult> => {
  try {
    // Optimize image with sharp
    const optimizedBuffer = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    return await uploadImage(optimizedBuffer, folder);
  } catch (error) {
    console.error('Image optimization error:', error);
    // Fallback to original image if optimization fails
    return await uploadImage(buffer, folder);
  }
};

/**
 * Create a thumbnail version of the image
 * @param buffer - Original image buffer
 * @param folder - Folder path in Cloudinary
 * @param width - Thumbnail width (default 300)
 * @param height - Thumbnail height (default 300)
 * @returns Upload result for thumbnail
 */
export const createThumbnail = async (
  buffer: Buffer,
  folder: string = config.cloudinary.folder,
  width: number = 300,
  height: number = 300
): Promise<ImageUploadResult> => {
  try {
    const thumbnailBuffer = await sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return await uploadImage(thumbnailBuffer, `${folder}/thumbnails`);
  } catch (error) {
    console.error('Thumbnail creation error:', error);
    throw new Error('Failed to create thumbnail');
  }
};

/**
 * Delete an image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * @returns Deletion result
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param publicIds - Array of public IDs to delete
 * @returns Deletion results
 */
export const deleteMultipleImages = async (publicIds: string[]): Promise<void> => {
  try {
    await Promise.all(publicIds.map((id) => deleteImage(id)));
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    throw new Error('Failed to delete images from Cloudinary');
  }
};

/**
 * Validate image file
 * @param mimetype - File mimetype
 * @param size - File size in bytes
 * @param maxSize - Maximum file size in bytes (default 10MB)
 * @returns True if valid, throws error otherwise
 */
export const validateImageFile = (
  mimetype: string,
  size: number,
  maxSize: number = 10 * 1024 * 1024 // 10MB
): boolean => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedTypes.includes(mimetype)) {
    throw new Error(
      'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
    );
  }

  if (size > maxSize) {
    throw new Error(
      `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB.`
    );
  }

  return true;
};

export default {
  uploadImage,
  optimizeAndUploadImage,
  createThumbnail,
  deleteImage,
  deleteMultipleImages,
  validateImageFile,
};
