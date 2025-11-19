/**
 * Async Handler Utility
 * Wraps async Express route handlers to properly handle promises
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler<T = Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Wraps an async Express route handler to catch errors and pass them to next()
 * This resolves @typescript-eslint/no-misused-promises errors
 */
export const asyncHandler = <T = Request>(fn: AsyncRequestHandler<T>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req as T, res, next)).catch(next);
  };
};
