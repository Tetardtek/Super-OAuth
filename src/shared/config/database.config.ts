export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionLimit: number;
}

export const getDatabaseConfig = (): DatabaseConfig => ({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  database: process.env.MYSQL_DATABASE || 'superoauth',
  username: process.env.MYSQL_USERNAME || 'superoauth_user',
  password: process.env.MYSQL_PASSWORD || 'password',
  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '20', 10),
});
