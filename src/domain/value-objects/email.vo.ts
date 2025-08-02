export class Email {
  private constructor(private readonly value: string) {}

  static create(email: string): Email {
    if (!email) {
      throw new Error('Email cannot be empty');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Check for common invalid patterns
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      throw new Error('Invalid email format');
    }

    return new Email(email.toLowerCase());
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  get domain(): string {
    return this.value.split('@')[1];
  }

  get localPart(): string {
    return this.value.split('@')[0];
  }
}
