import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from './errorHandler';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      const errorMessage = error.errors?.map((e: any) => e.message).join(', ') || 'Validation error';
      next(new AppError(errorMessage, 400));
    }
  };
};
