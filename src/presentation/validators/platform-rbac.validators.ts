import Joi from 'joi';

export const platformRbacValidators = {
  invite: Joi.object({
    email: Joi.string().email().max(255).required(),
  }),

  accept: Joi.object({
    token: Joi.string().hex().length(64).required(),
    password: Joi.string().min(12).max(128).required(),
  }),

  initiateTransfer: Joi.object({
    targetPlatformUserId: Joi.string().uuid().required(),
    currentPassword: Joi.string().required(),
  }),

  acceptTransfer: Joi.object({
    token: Joi.string().hex().length(64).required(),
    password: Joi.string().min(12).max(128).required(),
  }),

  declineTransfer: Joi.object({
    token: Joi.string().hex().length(64).required(),
  }),
};
