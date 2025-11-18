import { IPasswordService } from '../../application/interfaces/repositories.interface';
import bcrypt from 'bcrypt';

export class PasswordService implements IPasswordService {
  private readonly saltRounds: number;

  constructor() {
    this.saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');

    // Validate salt rounds
    if (this.saltRounds < 10 || this.saltRounds > 15) {
      throw new Error(
        'BCRYPT_ROUNDS must be between 10 and 15 for security and performance balance'
      );
    }
  }

  async hash(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    return bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Log error in production, return false for security
      console.error('Password verification error:', error);
      return false;
    }
  }
}
