import Joi from 'joi';

export const platformTenantsValidators = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    webhookUrl: Joi.string().uri().optional(),
    allowedOrigins: Joi.array().items(Joi.string().uri()).optional(),
    redirectUris: Joi.array().items(Joi.string().uri()).optional(),
    retentionDays: Joi.number().integer().min(1).max(3650).optional(),
  }),

  update: Joi.object({
    webhookUrl: Joi.string().uri().allow(null).optional(),
    allowedOrigins: Joi.array().items(Joi.string().uri()).allow(null).optional(),
    redirectUris: Joi.array().items(Joi.string().uri()).allow(null).optional(),
    retentionDays: Joi.number().integer().min(1).max(3650).optional(),
  }).min(1),
};
