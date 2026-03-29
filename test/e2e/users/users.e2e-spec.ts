import { ApiClient, ResourceTracker, TestData } from '../helpers';
import { getEnvironment } from '../setup/environment';

describe('Users (e2e)', () => {
  const env = getEnvironment();
  let api: ApiClient;
  let tracker: ResourceTracker;

  beforeAll(async () => {
    api = new ApiClient(env);
    tracker = new ResourceTracker(api);

    const loginRes = await api.loginAsAdmin();
    expect(loginRes.status).toBe(200);
  });

  afterAll(async () => {
    await tracker.cleanupAll();
  });

  // ── POST /users ──────────────────────────────────────────────────────

  describe('POST /users', () => {
    it('given valid user data, when create is called, then it returns 201 with user details', async () => {
      const email = TestData.email('create');
      const fullName = TestData.fullName('Create');

      const res = await api.post('/users', {
        email,
        fullName,
        roleId: env.adminRoleId,
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          email,
          fullName,
          role: expect.objectContaining({
            id: env.adminRoleId,
            name: expect.any(String),
          }),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );

      tracker.track('user', (res.body as { data: { id: string } }).data.id);
    });

    it('given a duplicate email, when create is called, then it returns 409', async () => {
      const email = TestData.email('dup-user');
      const fullName = TestData.fullName('DupUser');

      /* First creation. */
      const first = await api.post('/users', {
        email,
        fullName,
        roleId: env.adminRoleId,
      });
      expect(first.status).toBe(201);
      tracker.track('user', (first.body as { data: { id: string } }).data.id);

      /* Second creation with same email. */
      const second = await api.post('/users', {
        email,
        fullName: TestData.fullName('DupUser2'),
        roleId: env.adminRoleId,
      });
      expect(second.status).toBe(409);
    });

    it('given missing required fields, when create is called, then it returns 400', async () => {
      const res = await api.post('/users', { email: 'incomplete@e2e-test.local' });

      expect(res.status).toBe(400);
    });

    it('given an invalid email, when create is called, then it returns 400', async () => {
      const res = await api.post('/users', {
        email: 'not-an-email',
        fullName: TestData.fullName(),
        roleId: env.adminRoleId,
      });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /users ───────────────────────────────────────────────────────

  describe('GET /users', () => {
    it('given users exist, when list is called, then it returns a paginated response', async () => {
      const res = await api.get('/users');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          meta: expect.objectContaining({
            total: expect.any(Number),
            page: expect.any(Number),
            limit: expect.any(Number),
            totalPages: expect.any(Number),
          }),
        }),
      );
    });

    it('given page and limit params, when list is called, then it paginates accordingly', async () => {
      const res = await api.get('/users', { page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('given no access token, when list is called, then it returns 401', async () => {
      const unauthApi = new ApiClient(env);
      const res = await unauthApi.get('/users');

      expect(res.status).toBe(401);
    });

    it('given a search term, when list is called, then it returns only matching users', async () => {
      /* Create two uniquely named users so we can distinguish matches. */
      const uniqueFragment = `srch${Date.now()}`;
      const matchEmail = TestData.email(`${uniqueFragment}-match`);
      const matchName = `MatchUser ${uniqueFragment}`;
      const noMatchEmail = TestData.email(`nomatch${Date.now()}`);

      const c1 = await api.post('/users', {
        email: matchEmail,
        fullName: matchName,
        roleId: env.adminRoleId,
      });
      expect(c1.status).toBe(201);
      tracker.track('user', (c1.body as { data: { id: string } }).data.id);

      const c2 = await api.post('/users', {
        email: noMatchEmail,
        fullName: TestData.fullName('NoMatch'),
        roleId: env.adminRoleId,
      });
      expect(c2.status).toBe(201);
      tracker.track('user', (c2.body as { data: { id: string } }).data.id);

      const res = await api.get('/users', { search: uniqueFragment, limit: 50 });

      expect(res.status).toBe(200);
      const ids = (res.body as { data: Array<{ id: string }> }).data.map((u) => u.id);
      expect(ids).toContain((c1.body as { data: { id: string } }).data.id);
      expect(ids).not.toContain((c2.body as { data: { id: string } }).data.id);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('given an empty search string, when list is called, then it behaves like no search', async () => {
      const res = await api.get('/users', { search: '', limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('given sortBy=fullName&sortOrder=asc, when list is called, then users are returned in ascending name order', async () => {
      const res = await api.get('/users', { sortBy: 'fullName', sortOrder: 'asc', limit: 50 });

      expect(res.status).toBe(200);
      const names: string[] = (res.body as { data: Array<{ fullName: string }> }).data.map(
        (u) => u.fullName,
      );
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });

    it('given sortBy=email&sortOrder=desc, when list is called, then users are sorted by email descending', async () => {
      const res = await api.get('/users', { sortBy: 'email', sortOrder: 'desc', limit: 50 });

      expect(res.status).toBe(200);
      const emails: string[] = (res.body as { data: Array<{ email: string }> }).data.map(
        (u) => u.email,
      );
      const sorted = [...emails].sort((a, b) => b.localeCompare(a));
      expect(emails).toEqual(sorted);
    });

    it('given an invalid sortBy value, when list is called, then it returns 200 (falls back to default)', async () => {
      const res = await api.get('/users', { sortBy: 'invalid_column' });

      expect(res.status).toBe(200);
    });
  });

  // ── GET /users/:id ──────────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('given an existing user, when getById is called, then it returns the user', async () => {
      /* Create a user first. */
      const email = TestData.email('get');
      const fullName = TestData.fullName('Get');
      const createRes = await api.post('/users', {
        email,
        fullName,
        roleId: env.adminRoleId,
      });
      expect(createRes.status).toBe(201);
      const userId = (createRes.body as { data: { id: string } }).data.id;
      tracker.track('user', userId);

      /* Fetch it. */
      const res = await api.get(`/users/${userId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: userId,
          email,
          fullName,
        }),
      );
    });

    it('given a non-existent ID, when getById is called, then it returns 404', async () => {
      const fakeId = '00000000-0000-0000-0000-ffffffffffff';
      const res = await api.get(`/users/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /users/:id ────────────────────────────────────────────────

  describe('PATCH /users/:id', () => {
    it('given valid update data, when update is called, then it returns the updated user', async () => {
      /* Create a user to update. */
      const email = TestData.email('patch');
      const createRes = await api.post('/users', {
        email,
        fullName: TestData.fullName('Patch'),
        roleId: env.adminRoleId,
      });
      expect(createRes.status).toBe(201);
      const userId = (createRes.body as { data: { id: string } }).data.id;
      tracker.track('user', userId);

      /* Update the name. */
      const newName = TestData.fullName('Updated');
      const res = await api.patch(`/users/${userId}`, { fullName: newName });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe(newName);
      expect(res.body.data.email).toBe(email); /* unchanged */
    });

    it('given a non-existent ID, when update is called, then it returns 404', async () => {
      const fakeId = '00000000-0000-0000-0000-ffffffffffff';
      const res = await api.patch(`/users/${fakeId}`, {
        fullName: 'Ghost',
      });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /users/:id ───────────────────────────────────────────────

  describe('DELETE /users/:id', () => {
    it('given an existing user, when delete is called, then it returns 204 and the user is no longer found', async () => {
      /* Create a user to delete. */
      const createRes = await api.post('/users', {
        email: TestData.email('delete'),
        fullName: TestData.fullName('Delete'),
        roleId: env.adminRoleId,
      });
      expect(createRes.status).toBe(201);
      const userId = (createRes.body as { data: { id: string } }).data.id;
      /* Do NOT track — we are deleting it in this test. */

      /* Delete it. */
      const deleteRes = await api.delete(`/users/${userId}`);
      expect(deleteRes.status).toBe(204);

      /* Verify it is gone. */
      const getRes = await api.get(`/users/${userId}`);
      expect(getRes.status).toBe(404);
    });

    it('given a non-existent ID, when delete is called, then it returns 404', async () => {
      const fakeId = '00000000-0000-0000-0000-ffffffffffff';
      const res = await api.delete(`/users/${fakeId}`);

      expect(res.status).toBe(404);
    });

    it('given no access token, when delete is called, then it returns 401', async () => {
      const unauthApi = new ApiClient(env);
      const res = await unauthApi.delete('/users/00000000-0000-0000-0000-000000000001');

      expect(res.status).toBe(401);
    });
  });
});
