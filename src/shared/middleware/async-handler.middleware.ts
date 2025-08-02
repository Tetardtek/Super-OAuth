/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors and pass them to error handler
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (req: any, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wrapper for async route handlers
 * Automatically catches async errors and passes them to next()
 */
export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
