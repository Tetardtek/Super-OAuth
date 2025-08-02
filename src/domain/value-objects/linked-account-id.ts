import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../errors/domain-error';

export class LinkedAccountId {
  private readonly value: string;

  constructor(value?: string) {
    if (value) {
      this.validateId(value);
      this.value = value;
    } else {
      this.value = uuidv4();
    }
  }

  private validateId(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('LinkedAccount ID must be a non-empty string');
    }

    if (value.trim().length === 0) {
      throw new ValidationError('LinkedAccount ID cannot be empty');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new ValidationError('LinkedAccount ID must be a valid UUID');
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: LinkedAccountId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  static generate(): LinkedAccountId {
    return new LinkedAccountId();
  }
}
