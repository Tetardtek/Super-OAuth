import Joi from 'joi';

export class ValidationUtil {
  static readonly emailSchema = Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email must not exceed 255 characters',
      'any.required': 'Email is required',
    });

  static readonly passwordSchema = Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
      'any.required': 'Password is required',
    });

  static readonly nicknameSchema = Joi.string()
    .min(2)
    .max(32)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .custom((value: unknown, helpers) => {
      // Type guard: ensure value is a string
      if (typeof value !== 'string') {
        return helpers.error('nickname.invalidType');
      }

      if (
        value.startsWith('_') ||
        value.startsWith('-') ||
        value.endsWith('_') ||
        value.endsWith('-')
      ) {
        return helpers.error('nickname.invalidFormat');
      }

      const reservedNames = [
        'admin',
        'root',
        'api',
        'www',
        'mail',
        'support',
        'help',
        'oauth',
        'auth',
        'login',
        'signup',
        'register',
        'system',
      ];

      if (reservedNames.includes(value.toLowerCase())) {
        return helpers.error('nickname.reserved');
      }

      return value;
    })
    .required()
    .messages({
      'string.min': 'Nickname must be at least 2 characters long',
      'string.max': 'Nickname must not exceed 32 characters',
      'string.pattern.base': 'Nickname can only contain letters, numbers, underscores, and hyphens',
      'nickname.invalidFormat': 'Nickname cannot start or end with special characters',
      'nickname.reserved': 'This nickname is reserved',
      'nickname.invalidType': 'Nickname must be a string',
      'any.required': 'Nickname is required',
    });

  static readonly uuidSchema = Joi.string().uuid({ version: 'uuidv4' }).required().messages({
    'string.guid': 'Invalid UUID format',
    'any.required': 'UUID is required',
  });

  static validateEmail(email: string): { isValid: boolean; error?: string } {
    const { error } = this.emailSchema.validate(email);
    const result: { isValid: boolean; error?: string } = {
      isValid: !error,
    };
    if (error) {
      result.error = error.details[0]?.message;
    }
    return result;
  }

  static validatePassword(password: string): { isValid: boolean; error?: string } {
    const { error } = this.passwordSchema.validate(password);
    const result: { isValid: boolean; error?: string } = {
      isValid: !error,
    };
    if (error) {
      result.error = error.details[0]?.message;
    }
    return result;
  }

  static validateNickname(nickname: string): { isValid: boolean; error?: string } {
    const { error } = this.nicknameSchema.validate(nickname);
    const result: { isValid: boolean; error?: string } = {
      isValid: !error,
    };
    if (error) {
      result.error = error.details[0]?.message;
    }
    return result;
  }

  static sanitizeString(str: string): string {
    return str.trim().replace(/\s+/g, ' ');
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isValidIP(ip: string): boolean {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}
