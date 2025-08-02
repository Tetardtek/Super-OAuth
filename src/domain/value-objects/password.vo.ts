import bcrypt from 'bcryptjs';

export class Password {
  private constructor(private readonly value: string) {}

  static create(password: string): Password {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      throw new Error('Password cannot exceed 128 characters');
    }

    // Must contain at least one uppercase, one lowercase, one digit, one special char
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecialChar) {
      throw new Error(
        'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
      );
    }

    // Check for common weak patterns
    const commonPatterns = [
      /(.)\1{2,}/, // Same character repeated 3+ times
      /123456|654321|abcdef|azerty|qwerty|password/i, // Common sequences
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        throw new Error('Password contains weak patterns');
      }
    }

    return new Password(password);
  }

  /**
   * Create a password instance for existing users (bypass validation)
   * Used when loading from database where password may not meet current security standards
   * @param password The password value (for compatibility)
   * @returns Password instance without validation
   */
  static createForExistingUser(password: string = 'existing-user-password'): Password {
    return new Password(password);
  }

  hash(): string {
    return bcrypt.hashSync(this.value, 12);
  }

  static verify(plaintext: string, hash: string): boolean {
    return bcrypt.compareSync(plaintext, hash);
  }
}
