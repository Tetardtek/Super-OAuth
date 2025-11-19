/**
 * API Response Utility
 * Standardized response format for all API endpoints
 * @version 1.0.0
 */

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface StandardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
  timestamp: string;
  requestId?: string;
}

export class ApiResponse {
  /**
   * Create a successful response
   */
  static success<T>(data: T): StandardApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an error response
   */
  static error(message: string, code: string, details?: unknown): StandardApiResponse {
    return {
      success: false,
      error: details
        ? {
            message,
            code,
            details,
          }
        : {
            message,
            code,
          },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a validation error response
   */
  static validationError(errors: ValidationError[]): StandardApiResponse {
    return {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an unauthorized response
   */
  static unauthorized(message: string = 'Authentication required'): StandardApiResponse {
    return {
      success: false,
      error: {
        message,
        code: 'UNAUTHORIZED',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a forbidden response
   */
  static forbidden(message: string = 'Access denied'): StandardApiResponse {
    return {
      success: false,
      error: {
        message,
        code: 'FORBIDDEN',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a not found response
   */
  static notFound(message: string = 'Resource not found'): StandardApiResponse {
    return {
      success: false,
      error: {
        message,
        code: 'NOT_FOUND',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
