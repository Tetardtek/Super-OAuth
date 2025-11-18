import { logger } from '../utils/logger.util';

interface EnvironmentVariable {
  name: string;
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  description: string;
}

const ENVIRONMENT_VARIABLES: EnvironmentVariable[] = [
  {
    name: 'NODE_ENV',
    required: false,
    defaultValue: 'development',
    validator: (value) => ['development', 'production', 'test'].includes(value),
    description: 'Application environment (development, production, test)',
  },
  {
    name: 'PORT',
    required: false,
    defaultValue: '3000',
    validator: (value) => !isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0,
    description: 'Server port number',
  },
  {
    name: 'MYSQL_HOST',
    required: false,
    defaultValue: 'localhost',
    description: 'MySQL database host',
  },
  {
    name: 'MYSQL_PORT',
    required: false,
    defaultValue: '3306',
    validator: (value) => !isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0,
    description: 'MySQL database port',
  },
  {
    name: 'MYSQL_DATABASE',
    required: true,
    description: 'MySQL database name',
  },
  {
    name: 'MYSQL_USERNAME',
    required: true,
    description: 'MySQL database username',
  },
  {
    name: 'MYSQL_PASSWORD',
    required: true,
    description: 'MySQL database password',
  },
  {
    name: 'JWT_SECRET',
    required: true,
    validator: (value) => value.length >= 32,
    description: 'JWT secret key (minimum 32 characters)',
  },
  {
    name: 'JWT_ACCESS_EXPIRATION',
    required: false,
    defaultValue: '15m',
    description: 'JWT access token expiration time',
  },
  {
    name: 'JWT_REFRESH_EXPIRATION',
    required: false,
    defaultValue: '7d',
    description: 'JWT refresh token expiration time',
  },
];

export class EnvironmentValidator {
  static validate(): void {
    const errors: string[] = [];
    const warnings: string[] = [];

    logger.info('Validating environment variables...');

    for (const envVar of ENVIRONMENT_VARIABLES) {
      const value = process.env[envVar.name];

      // Check if required variable is missing
      if (envVar.required && !value) {
        errors.push(
          `Missing required environment variable: ${envVar.name} - ${envVar.description}`
        );
        continue;
      }

      // Use default value if not provided
      if (!value && envVar.defaultValue) {
        process.env[envVar.name] = envVar.defaultValue;
        warnings.push(`Using default value for ${envVar.name}: ${envVar.defaultValue}`);
        continue;
      }

      // Validate value if validator is provided
      if (value && envVar.validator && !envVar.validator(value)) {
        errors.push(`Invalid value for ${envVar.name}: ${value} - ${envVar.description}`);
      }
    }

    // Log warnings
    if (warnings.length > 0) {
      warnings.forEach((warning) => logger.warn(warning));
    }

    // Handle errors
    if (errors.length > 0) {
      logger.error('Environment validation failed');
      errors.forEach((error) => logger.error(error));
      process.exit(1);
    }

    logger.info('Environment validation completed successfully');
  }

  static getRequiredVariables(): string[] {
    return ENVIRONMENT_VARIABLES.filter((envVar) => envVar.required).map((envVar) => envVar.name);
  }

  static generateExampleEnv(): string {
    let content = '# SuperOAuth Environment Configuration\n\n';

    for (const envVar of ENVIRONMENT_VARIABLES) {
      content += `# ${envVar.description}\n`;
      if (envVar.required) {
        content += `${envVar.name}=\n\n`;
      } else {
        content += `${envVar.name}=${envVar.defaultValue || ''}\n\n`;
      }
    }

    return content;
  }
}
