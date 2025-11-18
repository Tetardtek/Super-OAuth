import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('linked_accounts')
@Index('idx_linked_accounts_user_provider', ['userId', 'provider'], { unique: true })
@Index('idx_linked_accounts_provider_id', ['provider', 'providerId'], { unique: true })
@Index('idx_linked_accounts_user_id', ['userId'])
export class LinkedAccountEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ type: 'varchar', length: 255, name: 'provider_id' })
  providerId!: string;

  @Column({ type: 'varchar', length: 255, name: 'display_name' })
  displayName!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl?: string | null;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne('UserEntity', 'linkedAccounts', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: any;
}
