import { ApiClient, ResourceTracker, TestData } from '../helpers';
import { getEnvironment } from '../setup/environment';

describe('Auth (e2e)', () => {
  const env = getEnvironment();
  let api: ApiClient;
  let tracker: ResourceTracker;

  beforeAll(async () => {
    api = new ApiClient(env);
    tracker = new ResourceTracker(api);

    /* Login as admin so the tracker can clean up created resources. */
    const loginRes = await api.loginAsAdmin();
    expect(loginRes.status).toBe(200);
  });

  afterAll(async () => {
    await tracker.cleanupAll();
  });

  // ── POST /auth/login ─────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('given valid admin credentials, when login is called, then it returns an access token', async () => {
      const freshApi = new ApiClient(env);
      const res = await freshApi.login(env.adminEmail, env.adminPassword);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          tokenType: 'Bearer',
          expiresIn: expect.any(Number),
        }),
      );
    });

    it('given an incorrect password, when login is called, then it returns 401', async () => {
      const freshApi = new ApiClient(env);
      const res = await freshApi.login(env.adminEmail, 'WrongPassword99!');

      expect(res.status).toBe(401);
    });

    it('given a non-existent email, when login is called, then it returns 401', async () => {
      const freshApi = new ApiClient(env);
      const res = await freshApi.login('nobody@e2e-test.local', 'AnyPass123!');

      expect(res.status).toBe(401);
    });
  });

  // ── POST /auth/register ──────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('given valid registration data, when register is called, then it returns an access token', async () => {
      const email = TestData.email('register');
      const res = await api.register({
        email,
        fullName: TestData.fullName('Register'),
        password: TestData.password(),
        roleId: env.adminRoleId,
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          tokenType: 'Bearer',
          expiresIn: expect.any(Number),
        }),
      );

      /*
       * The registration flow creates a user in user-service via Pub/Sub.
       * We need to find the created user so we can track it for cleanup.
       * Login with the new credentials to get the user ID from a token, or
       * simply search users by email.
       */
      const searchRes = await api.get('/users', { page: 1, limit: 100 });
      const users = (searchRes.body as { data?: { email: string; id: string }[] }).data ?? [];
      const createdUser = users.find((u) => u.email === email);
      if (createdUser !== undefined) {
        tracker.track('user', createdUser.id);
      }
    });

    it('given a duplicate email, when register is called, then it returns 409', async () => {
      const email = TestData.email('dup');

      /* First registration should succeed. */
      const first = await api.register({
        email,
        fullName: TestData.fullName('Dup'),
        password: TestData.password(),
        roleId: env.adminRoleId,
      });
      expect(first.status).toBe(201);

      /* Track the user for cleanup. */
      const searchRes = await api.get('/users', { page: 1, limit: 100 });
      const users = (searchRes.body as { data?: { email: string; id: string }[] }).data ?? [];
      const createdUser = users.find((u) => u.email === email);
      if (createdUser !== undefined) {
        tracker.track('user', createdUser.id);
      }

      /* Second registration with same email should fail. */
      const second = await api.register({
        email,
        fullName: TestData.fullName('Dup2'),
        password: TestData.password(),
        roleId: env.adminRoleId,
      });
      expect(second.status).toBe(409);
    });

    it('given an invalid email format, when register is called, then it returns 400', async () => {
      const res = await api.register({
        email: 'not-an-email',
        fullName: TestData.fullName(),
        password: TestData.password(),
        roleId: env.adminRoleId,
      });

      expect(res.status).toBe(400);
    });

    it('given a password shorter than 8 chars, when register is called, then it returns 400', async () => {
      const res = await api.register({
        email: TestData.email(),
        fullName: TestData.fullName(),
        password: 'short',
        roleId: env.adminRoleId,
      });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /auth/logout ────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('given a valid access token, when logout is called, then it returns 204', async () => {
      /* Register + login a temporary user. */
      const email = TestData.email('logout');
      const regRes = await api.register({
        email,
        fullName: TestData.fullName('Logout'),
        password: TestData.password(),
        roleId: env.adminRoleId,
      });
      expect(regRes.status).toBe(201);

      /* Track for cleanup. */
      const searchRes = await api.get('/users', { page: 1, limit: 100 });
      const users = (searchRes.body as { data?: { email: string; id: string }[] }).data ?? [];
      const createdUser = users.find((u) => u.email === email);
      if (createdUser !== undefined) {
        tracker.track('user', createdUser.id);
      }

      /* Login as the new user. */
      const tempApi = new ApiClient(env);
      const loginRes = await tempApi.login(email, TestData.password());
      expect(loginRes.status).toBe(200);

      /* Logout. */
      const logoutRes = await tempApi.logout();
      expect(logoutRes.status).toBe(204);
    });

    it('given no access token, when logout is called, then it returns 401', async () => {
      const unauthApi = new ApiClient(env);
      const res = await unauthApi.logout();

      expect(res.status).toBe(401);
    });
  });
});
