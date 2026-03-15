import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { LinkedAccountEntity } from './linked-account.entity';
import type { SessionEntity } from './session.entity';

@Entity('users')
@Index('idx_users_tenant_email', ['tenantId', 'email'], { unique: true })
@Index('idx_users_tenant_nickname', ['tenantId', 'nickname'], { unique: true })
@Index('idx_users_created_at', ['createdAt'])
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, name: 'tenant_id', default: 'origins' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'boolean', default: false, name: 'email_verified' })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'email_source' })
  emailSource?: string | null;

  @Column({ type: 'varchar', length: 32 })
  nickname!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'password_hash' })
  passwordHash?: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login' })
  lastLogin?: Date | null;

  @Column({ type: 'int', default: 0, name: 'login_count' })
  loginCount!: number;

  @OneToMany('LinkedAccountEntity', 'user', { cascade: true })
  linkedAccounts!: LinkedAccountEntity[];

  @OneToMany('SessionEntity', 'user', { cascade: true })
  sessions!: SessionEntity[];
}
