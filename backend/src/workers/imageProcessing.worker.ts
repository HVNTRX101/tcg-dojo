import { Job } from 'bull';
import { getQueue, QueueName } from '../config/queue';
import logger from '../config/logger';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

/**
 * Image Processing Worker
 *
 * Processes image optimization and thumbnail generation in the background
 */

export interface ImageProcessingJobData {
  imagePath: string;
  outputDir: string;
  sizes?: Array<{
    name: string;
    width: number;
    height?: number;
  }>;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

interface ProcessedImage {
  name: string;
  path: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Process image job
 */
async function processImageJob(job: Job<ImageProcessingJobData>): Promise<ProcessedImage[]> {
  const {
    imagePath,
    outputDir,
    sizes = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'small', width: 300 },
      { name: 'medium', width: 600 },
      { name: 'large', width: 1200 },
    ],
    format = 'webp',
    quality = 85,
  } = job.data;

  logger.info('Processing image job', {
    jobId: job.id,
    imagePath,
    sizesCount: sizes.length,
  });

  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Load image
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    const processedImages: ProcessedImage[] = [];

    // Process each size
    for (const size of sizes) {
      const outputPath = path.join(
        outputDir,
        `${size.name}.${format}`
      );

      let resizedImage = image.clone().resize({
        width: size.width,
        height: size.height,
        fit: size.height ? 'cover' : 'inside',
        withoutEnlargement: true,
      });

      // Apply format and quality
      switch (format) {
        case 'jpeg':
          resizedImage = resizedImage.jpeg({ quality });
          break;
        case 'png':
          resizedImage = resizedImage.png({ quality });
          break;
        case 'webp':
          resizedImage = resizedImage.webp({ quality });
          break;
      }

      // Save processed image
      const info = await resizedImage.toFile(outputPath);

      processedImages.push({
        name: size.name,
        path: outputPath,
        width: info.width,
        height: info.height,
        size: info.size,
      });

      logger.info('Image size processed', {
        jobId: job.id,
        size: size.name,
        width: info.width,
        height: info.height,
      });
    }

    logger.info('Image processing completed', {
      jobId: job.id,
      imagesProcessed: processedImages.length,
    });

    return processedImages;
  } catch (error: any) {
    logger.error('Failed to process image', {
      jobId: job.id,
      error: error.message,
      imagePath,
    });
    throw error;
  }
}

/**
 * Start image processing worker
 */
export function startImageProcessingWorker(): void {
  const queue = getQueue(QueueName.IMAGE_PROCESSING);

  queue.process(3, processImageJob); // Process 3 images concurrently

  logger.info('Image processing worker started');
}

/**
 * Queue an image for processing
 */
export async function queueImageProcessing(
  data: ImageProcessingJobData
): Promise<string> {
  const queue = getQueue(QueueName.IMAGE_PROCESSING);

  const job = await queue.add(data, {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  });

  return job.id?.toString() || '';
}
