import { randomUUID } from 'node:crypto';

/**
 * Factory helpers for generating unique test data.
 * Every value includes a random suffix to avoid collisions between test runs.
 */
export class TestData {
  /**
   * Generate a unique test email.
   *
   * @param prefix - Optional prefix (default: `e2euser`).
   */
  static email(prefix = 'e2euser'): string {
    const suffix = randomUUID().slice(0, 8);
    return `${prefix}-${suffix}@e2e-test.local`;
  }

  /** Generate a unique full name for a test user. */
  static fullName(prefix = 'E2E User'): string {
    const suffix = randomUUID().slice(0, 6);
    return `${prefix} ${suffix}`;
  }

  /** A password that satisfies the minimum 8-char constraint. */
  static password(): string {
    return 'TestPass123!';
  }
}
