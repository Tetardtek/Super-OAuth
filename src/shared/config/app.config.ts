export interface AppConfig {
  nodeEnv: string;
  appName: string;
  appVersion: string;
  port: number;
  apiVersion: string;
  apiBasePath: string;
}

export const getAppConfig = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'SuperOAuth',
  appVersion: process.env.APP_VERSION || '1.0.0',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  apiBasePath: process.env.API_BASE_PATH || '/api/v1',
});
