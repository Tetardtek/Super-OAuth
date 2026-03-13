import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './shared/config/database.config';
import { UserEntity } from './infrastructure/database/entities/user.entity';
import { LinkedAccountEntity } from './infrastructure/database/entities/linked-account.entity';
import { SessionEntity } from './infrastructure/database/entities/session.entity';

const config = getDatabaseConfig();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  database: config.database,
  entities: [UserEntity, LinkedAccountEntity, SessionEntity],
  migrations: [
    process.env.NODE_ENV === 'production'
      ? 'dist/infrastructure/database/migrations/*.js'
      : 'src/infrastructure/database/migrations/*.ts',
  ],
  charset: 'utf8mb4',
  timezone: 'Z',
});
