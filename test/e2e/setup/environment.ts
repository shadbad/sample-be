/**
 * Environment configuration for e2e tests.
 * Each environment defines the base URL of the API gateway and admin credentials.
 */

interface E2eEnvironment {
  /** Base URL of the API gateway (no trailing slash). */
  readonly baseUrl: string;
  /** Admin email seeded in the identity-service. */
  readonly adminEmail: string;
  /** Admin password seeded in the identity-service. */
  readonly adminPassword: string;
  /** Role ID used for test users (admin role). */
  readonly adminRoleId: string;
}

const environments: Record<string, E2eEnvironment> = {
  local: {
    baseUrl: 'http://localhost:3000/v1',
    adminEmail: 'admin@example.com',
    adminPassword: 'Admin1234!',
    adminRoleId: '82643745-f3f0-440f-885a-d9b88d0f3d18',
  },
};

/**
 * Resolves the active e2e environment.
 * Set `E2E_ENV` env-var to switch environments (default: `local`).
 */
export function getEnvironment(): E2eEnvironment {
  const envName = process.env['E2E_ENV'] ?? 'local';
  const env = environments[envName];
  if (env === undefined) {
    throw new Error(
      `Unknown e2e environment "${envName}". Available: ${Object.keys(environments).join(', ')}`,
    );
  }
  return env;
}

export type { E2eEnvironment };
