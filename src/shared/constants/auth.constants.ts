export const AUTH_CONSTANTS = {
  PROVIDERS: {
    DISCORD: 'discord',
    GOOGLE: 'google',
    GITHUB: 'github',
  },

  TOKEN_TYPES: {
    ACCESS: 'access',
    REFRESH: 'refresh',
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset',
  },

  DEVICE_TYPES: {
    DESKTOP: 'desktop',
    MOBILE: 'mobile',
    TABLET: 'tablet',
    UNKNOWN: 'unknown',
  },

  AUTH_METHODS: {
    CLASSIC: 'classic',
    DISCORD: 'discord',
    GOOGLE: 'google',
    GITHUB: 'github',
  },
} as const;
