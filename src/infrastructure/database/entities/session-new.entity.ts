import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('sessions')
@Index('idx_sessions_user_id', ['userId'])
@Index('idx_sessions_token', ['token'], { unique: true })
@Index('idx_sessions_expires_at', ['expiresAt'])
@Index('idx_sessions_active', ['isActive'])
export class SessionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  token!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'refresh_token' })
  refreshToken?: string | null;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress?: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent?: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'timestamp', name: 'last_activity' })
  lastActivity!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne('UserEntity', 'sessions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: any;
}
