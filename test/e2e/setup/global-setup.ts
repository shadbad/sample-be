import request from 'supertest';

import { getEnvironment } from './environment';

/**
 * Global setup for e2e tests.
 * Verifies the API gateway is reachable before running any test suite.
 */
export default async function globalSetup(): Promise<void> {
  const { baseUrl } = getEnvironment();

  /* Strip the /v1 path to hit the root or health endpoint. */
  const origin = baseUrl.replace(/\/v1$/, '');

  try {
    /* A simple GET to the gateway root — expect 200 or 404 (anything but connection error). */
    await request(origin).get('/').timeout({ response: 5000 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `E2E global-setup: API gateway at ${origin} is not reachable. ` +
        `Make sure all services are running (npm run dev).\n${msg}`,
    );
  }

  console.log(`\n  E2E targeting: ${baseUrl}\n`);
}
