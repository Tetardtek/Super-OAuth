import Joi from 'joi';

const passwordRule = Joi.string()
  .min(8)
  .max(128)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])'))
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
    'any.required': 'Password is required',
  });

export const platformAuthValidators = {
  signup: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),
    password: passwordRule,
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  refresh: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  logout: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  passwordResetRequest: Joi.object({
    email: Joi.string().email().required(),
  }),

  passwordResetConfirm: Joi.object({
    token: Joi.string().required(),
    newPassword: passwordRule,
  }),
};
