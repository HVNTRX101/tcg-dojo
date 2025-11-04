import multer from 'multer';
import { Request } from 'express';
import { AppError } from './errorHandler';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
        400
      ) as any
    );
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Export different upload configurations
export const uploadSingle = upload.single('image');
export const uploadMultiple = upload.array('images', 10); // Max 10 images

export default upload;
