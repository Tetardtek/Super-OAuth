export class DateUtil {
  static now(): Date {
    return new Date();
  }

  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  static addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  static isExpired(date: Date, now: Date = new Date()): boolean {
    return date < now;
  }

  static getTimestamp(): number {
    return Date.now();
  }

  static toISOString(date: Date): string {
    return date.toISOString();
  }

  static fromISOString(isoString: string): Date {
    return new Date(isoString);
  }

  static formatForDatabase(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  static isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  static getDurationInMs(start: Date, end: Date): number {
    return end.getTime() - start.getTime();
  }

  static getDurationInSeconds(start: Date, end: Date): number {
    return Math.floor(this.getDurationInMs(start, end) / 1000);
  }

  static getAgeInMs(date: Date, now: Date = new Date()): number {
    return now.getTime() - date.getTime();
  }

  static isWithinMinutes(date: Date, minutes: number, now: Date = new Date()): boolean {
    const diff = Math.abs(this.getDurationInMs(date, now));
    return diff <= minutes * 60 * 1000;
  }
}
