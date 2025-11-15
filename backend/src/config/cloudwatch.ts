import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
import AWS from 'aws-sdk';

/**
 * CloudWatch Logging Configuration
 * Centralized logging to AWS CloudWatch for production monitoring
 */

export interface CloudWatchConfig {
  enabled: boolean;
  logGroupName: string;
  logStreamName: string;
  awsRegion: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
}

/**
 * Create CloudWatch transport for Winston logger
 */
export const createCloudWatchTransport = (config: CloudWatchConfig): WinstonCloudWatch | null => {
  if (!config.enabled) {
    return null;
  }

  try {
    // Configure AWS SDK
    if (config.awsAccessKeyId && config.awsSecretAccessKey) {
      AWS.config.update({
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
        region: config.awsRegion,
      });
    } else {
      // Use IAM role or environment credentials
      AWS.config.update({
        region: config.awsRegion,
      });
    }

    const cloudWatchTransport = new WinstonCloudWatch({
      logGroupName: config.logGroupName,
      logStreamName: config.logStreamName,
      awsRegion: config.awsRegion,
      messageFormatter: ({ level, message, meta }: any) => {
        return JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          ...meta,
        });
      },
      retentionInDays: 30,
      uploadRate: 2000, // Send logs every 2 seconds
      errorHandler: (error: Error) => {
        console.error('CloudWatch logging error:', error);
      },
    });

    return cloudWatchTransport;
  } catch (error) {
    console.error('Failed to create CloudWatch transport:', error);
    return null;
  }
};

/**
 * Get CloudWatch configuration from environment variables
 */
export const getCloudWatchConfig = (): CloudWatchConfig => {
  return {
    enabled: process.env.CLOUDWATCH_ENABLED === 'true',
    logGroupName: process.env.CLOUDWATCH_LOG_GROUP || '/aws/tcg-marketplace/backend',
    logStreamName: process.env.CLOUDWATCH_LOG_STREAM || `${process.env.NODE_ENV || 'development'}-${new Date().toISOString().split('T')[0]}`,
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
};

export default {
  createCloudWatchTransport,
  getCloudWatchConfig,
};
