import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

/**
 * File Upload Service
 * Handles file upload progress tracking with real-time WebSocket updates
 */

interface UploadProgress {
  uploadId: string;
  userId: string;
  filename: string;
  totalBytes: number;
  uploadedBytes: number;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// Store for active uploads
const activeUploads = new Map<string, UploadProgress>();

let io: SocketIOServer | null = null;

/**
 * Initialize file upload service with Socket.io instance
 */
export const initializeFileUploadService = (socketIo: SocketIOServer) => {
  io = socketIo;
  console.log('📁 File upload service initialized with WebSocket support');
};

/**
 * Create a new upload session
 */
export const createUploadSession = (userId: string, filename: string, totalBytes: number): string => {
  const uploadId = uuidv4();

  const uploadProgress: UploadProgress = {
    uploadId,
    userId,
    filename,
    totalBytes,
    uploadedBytes: 0,
    progress: 0,
    status: 'pending',
    startedAt: new Date(),
  };

  activeUploads.set(uploadId, uploadProgress);

  // Emit initial progress to user
  emitUploadProgress(userId, uploadProgress);

  console.log(`📤 Upload session created: ${uploadId} for ${filename} (${totalBytes} bytes)`);

  return uploadId;
};

/**
 * Update upload progress
 */
export const updateUploadProgress = (uploadId: string, uploadedBytes: number) => {
  const upload = activeUploads.get(uploadId);

  if (!upload) {
    console.warn(`Upload session not found: ${uploadId}`);
    return;
  }

  upload.uploadedBytes = uploadedBytes;
  upload.progress = Math.round((uploadedBytes / upload.totalBytes) * 100);
  upload.status = 'uploading';

  // Emit progress update
  emitUploadProgress(upload.userId, upload);
};

/**
 * Mark upload as processing (e.g., for image optimization)
 */
export const markUploadProcessing = (uploadId: string) => {
  const upload = activeUploads.get(uploadId);

  if (!upload) {
    console.warn(`Upload session not found: ${uploadId}`);
    return;
  }

  upload.status = 'processing';
  upload.progress = 100;

  // Emit processing status
  emitUploadProgress(upload.userId, upload);

  console.log(`⚙️ Upload ${uploadId} processing`);
};

/**
 * Mark upload as completed
 */
export const completeUpload = (uploadId: string, resultUrl?: string) => {
  const upload = activeUploads.get(uploadId);

  if (!upload) {
    console.warn(`Upload session not found: ${uploadId}`);
    return;
  }

  upload.status = 'completed';
  upload.progress = 100;
  upload.completedAt = new Date();

  // Emit completion
  emitUploadComplete(upload.userId, {
    uploadId,
    filename: upload.filename,
    url: resultUrl,
    duration: upload.completedAt.getTime() - upload.startedAt.getTime(),
  });

  console.log(`✅ Upload ${uploadId} completed in ${upload.completedAt.getTime() - upload.startedAt.getTime()}ms`);

  // Clean up after 1 minute
  setTimeout(() => {
    activeUploads.delete(uploadId);
  }, 60 * 1000);
};

/**
 * Mark upload as failed
 */
export const failUpload = (uploadId: string, error: string) => {
  const upload = activeUploads.get(uploadId);

  if (!upload) {
    console.warn(`Upload session not found: ${uploadId}`);
    return;
  }

  upload.status = 'failed';
  upload.error = error;
  upload.completedAt = new Date();

  // Emit failure
  emitUploadError(upload.userId, {
    uploadId,
    filename: upload.filename,
    error,
  });

  console.error(`❌ Upload ${uploadId} failed: ${error}`);

  // Clean up after 5 minutes
  setTimeout(() => {
    activeUploads.delete(uploadId);
  }, 5 * 60 * 1000);
};

/**
 * Get upload progress
 */
export const getUploadProgress = (uploadId: string): UploadProgress | null => {
  return activeUploads.get(uploadId) || null;
};

/**
 * Get all uploads for a user
 */
export const getUserUploads = (userId: string): UploadProgress[] => {
  return Array.from(activeUploads.values()).filter(u => u.userId === userId);
};

// ============================================
// WEBSOCKET EVENTS
// ============================================

/**
 * Emit upload progress to user
 */
const emitUploadProgress = (userId: string, progress: UploadProgress) => {
  if (!io) return;

  io.to(`user:${userId}`).emit('upload:progress', {
    uploadId: progress.uploadId,
    filename: progress.filename,
    progress: progress.progress,
    uploadedBytes: progress.uploadedBytes,
    totalBytes: progress.totalBytes,
    status: progress.status,
  });
};

/**
 * Emit upload completion to user
 */
const emitUploadComplete = (userId: string, data: any) => {
  if (!io) return;

  io.to(`user:${userId}`).emit('upload:complete', data);
};

/**
 * Emit upload error to user
 */
const emitUploadError = (userId: string, data: any) => {
  if (!io) return;

  io.to(`user:${userId}`).emit('upload:error', data);
};

// ============================================
// CLEANUP
// ============================================

/**
 * Clean up old completed/failed uploads
 */
export const cleanupOldUploads = () => {
  const cutoffTime = Date.now() - 10 * 60 * 1000; // 10 minutes
  let cleaned = 0;

  for (const [uploadId, upload] of activeUploads.entries()) {
    if (
      upload.completedAt &&
      upload.completedAt.getTime() < cutoffTime &&
      ['completed', 'failed'].includes(upload.status)
    ) {
      activeUploads.delete(uploadId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} old upload sessions`);
  }
};

// Clean up old uploads every 5 minutes
setInterval(() => {
  cleanupOldUploads();
}, 5 * 60 * 1000);

/**
 * Get upload statistics
 */
export const getUploadStatistics = () => {
  const uploads = Array.from(activeUploads.values());

  return {
    total: uploads.length,
    pending: uploads.filter(u => u.status === 'pending').length,
    uploading: uploads.filter(u => u.status === 'uploading').length,
    processing: uploads.filter(u => u.status === 'processing').length,
    completed: uploads.filter(u => u.status === 'completed').length,
    failed: uploads.filter(u => u.status === 'failed').length,
    averageUploadTime: uploads
      .filter(u => u.completedAt && u.status === 'completed')
      .reduce((sum, u) => sum + (u.completedAt!.getTime() - u.startedAt.getTime()), 0) /
      (uploads.filter(u => u.status === 'completed').length || 1),
  };
};

console.log('📁 File upload service loaded');
