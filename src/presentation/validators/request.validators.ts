import Joi from 'joi';

export const authValidators = {
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
        'any.required': 'Password is required'
      }),
    
    nickname: Joi.string()
      .min(2)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .required()
      .messages({
        'string.min': 'Nickname must be at least 2 characters long',
        'string.max': 'Nickname must not exceed 30 characters',
        'string.pattern.base': 'Nickname can only contain letters, numbers, underscores, and hyphens',
        'any.required': 'Nickname is required'
      })
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required'
      })
  }),

  oauthProvider: Joi.object({
    provider: Joi.string()
      .valid('discord', 'twitch', 'google', 'github')
      .required()
      .messages({
        'any.only': 'Provider must be one of: discord, twitch, google, github',
        'any.required': 'Provider is required'
      }),
    
    redirectUri: Joi.string()
      .uri()
      .optional()
      .messages({
        'string.uri': 'Redirect URI must be a valid URL'
      })
  }),

  oauthCallback: Joi.object({
    code: Joi.string()
      .required()
      .messages({
        'any.required': 'Authorization code is required'
      }),
    
    state: Joi.string()
      .required()
      .messages({
        'any.required': 'State parameter is required'
      })
  })
};

export const userValidators = {
  updateProfile: Joi.object({
    nickname: Joi.string()
      .min(2)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .optional()
      .messages({
        'string.min': 'Nickname must be at least 2 characters long',
        'string.max': 'Nickname must not exceed 30 characters',
        'string.pattern.base': 'Nickname can only contain letters, numbers, underscores, and hyphens'
      }),
    
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Email must be a valid email address'
      })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
        'any.required': 'New password is required'
      })
  })
};
