export class Nickname {
  private constructor(private readonly value: string) {}

  static create(nickname: string): Nickname {
    if (!nickname) {
      throw new Error('Nickname cannot be empty');
    }

    if (nickname.length < 2) {
      throw new Error('Nickname must be at least 2 characters long');
    }

    if (nickname.length > 32) {
      throw new Error('Nickname cannot exceed 32 characters');
    }

    // Only alphanumeric, underscores, hyphens, dots allowed (GitHub allows dots)
    const validPattern = /^[a-zA-Z0-9_.\-]+$/;
    if (!validPattern.test(nickname)) {
      throw new Error('Nickname can only contain letters, numbers, underscores, hyphens, and dots');
    }

    // Cannot start or end with special characters
    if (/^[_.\-]|[_.\-]$/.test(nickname)) {
      throw new Error('Nickname cannot start or end with special characters');
    }

    // Reserved nicknames
    const reservedNames = [
      'admin',
      'root',
      'api',
      'www',
      'mail',
      'support',
      'help',
      'oauth',
      'auth',
      'login',
      'signup',
      'register',
      'system',
    ];

    if (reservedNames.includes(nickname.toLowerCase())) {
      throw new Error('This nickname is reserved');
    }

    return new Nickname(nickname);
  }

  equals(other: Nickname): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  toString(): string {
    return this.value;
  }

  get normalized(): string {
    return this.value.toLowerCase();
  }
}
