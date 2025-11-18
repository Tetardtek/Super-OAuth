/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors and pass them to error handler
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';

type AsyncFunction<T = Request> = (req: T, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wrapper for async route handlers
 * Automatically catches async errors and passes them to next()
 */
export const asyncHandler = <T extends Request = Request>(fn: AsyncFunction<T>) => {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
