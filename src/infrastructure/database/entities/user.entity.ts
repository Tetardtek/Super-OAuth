import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
@Index('idx_users_email', ['email'], { unique: true, where: 'email IS NOT NULL' })
@Index('idx_users_nickname', ['nickname'], { unique: true })
@Index('idx_users_created_at', ['createdAt'])
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email?: string | null;

  @Column({ type: 'boolean', default: false, name: 'email_verified' })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 32, unique: true })
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
  linkedAccounts!: any[];

  @OneToMany('SessionEntity', 'user', { cascade: true })
  sessions!: any[];
}
