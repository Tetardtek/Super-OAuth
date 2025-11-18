import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { LinkedAccountEntity } from '../entities/linked-account.entity';
import { SessionEntity } from '../entities/session.entity';
import { getDatabaseConfig } from '@shared/config/database.config';
import { logger } from '@shared/utils/logger.util';

export class DatabaseConnection {
  private static instance: DataSource;

  static getInstance(): DataSource {
    if (!DatabaseConnection.instance) {
      const config = getDatabaseConfig();

      DatabaseConnection.instance = new DataSource({
        type: 'mysql',
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        entities: [UserEntity, LinkedAccountEntity, SessionEntity],
        migrations: ['dist/infrastructure/database/migrations/*.js'],
        migrationsRun: process.env.NODE_ENV !== 'production',
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        extra: {
          connectionLimit: config.connectionLimit,
        },
        charset: 'utf8mb4',
        timezone: 'Z',
      });
    }

    return DatabaseConnection.instance;
  }

  static async initialize(): Promise<DataSource> {
    const dataSource = this.getInstance();

    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      logger.info('Database connection established');
    }

    return dataSource;
  }

  static getDataSource(): DataSource {
    return this.getInstance();
  }

  static async close(): Promise<void> {
    if (DatabaseConnection.instance?.isInitialized) {
      await DatabaseConnection.instance.destroy();
      logger.info('Database connection closed');
    }
  }
}
