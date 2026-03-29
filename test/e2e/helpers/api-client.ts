import request from 'supertest';

import type { E2eEnvironment } from '../setup/environment';

/**
 * Thin wrapper around `supertest` that targets a running API gateway.
 * Provides pre-configured methods for authenticated and unauthenticated requests.
 */
export class ApiClient {
  private _accessToken: string | undefined;

  constructor(private readonly _env: E2eEnvironment) {}

  /** Current access token (undefined until login). */
  get accessToken(): string | undefined {
    return this._accessToken;
  }

  /** Set the access token used for authenticated requests. */
  setAccessToken(token: string): void {
    this._accessToken = token;
  }

  /** Clear the access token. */
  clearAccessToken(): void {
    this._accessToken = undefined;
  }

  // ── Auth helpers ──────────────────────────────────────────────────────

  /** Login with the given credentials and store the access token. */
  async login(email: string, password: string): Promise<request.Response> {
    const res = await this.post('/auth/login', { email, password });
    if (res.status === 200) {
      const body = res.body as { data?: { accessToken?: string } };
      this._accessToken = body.data?.accessToken;
    }
    return res;
  }

  /** Login as the seeded admin user. */
  async loginAsAdmin(): Promise<request.Response> {
    return this.login(this._env.adminEmail, this._env.adminPassword);
  }

  /** Register a new credential. */
  async register(body: {
    email: string;
    fullName: string;
    password: string;
  }): Promise<request.Response> {
    return this.post('/auth/register', body);
  }

  /** Logout the current user. */
  async logout(): Promise<request.Response> {
    return this.post('/auth/logout');
  }

  // ── Generic HTTP verbs ────────────────────────────────────────────────

  /** Send a GET request. Attaches the bearer token if available. */
  async get(path: string, query?: Record<string, string | number>): Promise<request.Response> {
    let req = request(this._env.baseUrl).get(path);
    if (this._accessToken !== undefined) {
      req = req.set('Authorization', `Bearer ${this._accessToken}`);
    }
    if (query !== undefined) {
      req = req.query(query);
    }
    return req;
  }

  /** Send a POST request. Attaches the bearer token if available. */
  async post(path: string, body?: Record<string, unknown>): Promise<request.Response> {
    let req = request(this._env.baseUrl)
      .post(path)
      .send(body ?? {});
    if (this._accessToken !== undefined) {
      req = req.set('Authorization', `Bearer ${this._accessToken}`);
    }
    return req;
  }

  /** Send a PATCH request. Attaches the bearer token if available. */
  async patch(path: string, body?: Record<string, unknown>): Promise<request.Response> {
    let req = request(this._env.baseUrl)
      .patch(path)
      .send(body ?? {});
    if (this._accessToken !== undefined) {
      req = req.set('Authorization', `Bearer ${this._accessToken}`);
    }
    return req;
  }

  /** Send a DELETE request. Attaches the bearer token if available. */
  async delete(path: string): Promise<request.Response> {
    let req = request(this._env.baseUrl).delete(path);
    if (this._accessToken !== undefined) {
      req = req.set('Authorization', `Bearer ${this._accessToken}`);
    }
    return req;
  }
}
