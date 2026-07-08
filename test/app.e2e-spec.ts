import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/prisma/prisma.service';

const TEST_USER = {
  email: 'test@example.com',
  login: 'test',
  password: '12345678',
};

describe('e2e endpoints', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authToken: string;
  let refreshToken: string;
  let testUserId: number;
  let jwt: JwtService;

  beforeAll(async () => {
    // Override rate limiter for tests (prevents 429 during multiple login calls)
    process.env.RATE_LIMIT_REQUESTS = '99999';
    process.env.RATE_LIMIT_SECONDS = '1';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule], // ← FULL application module
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    try {
      await prisma.$connect();
    } catch (e) {
      console.warn(
        'Prisma $connect warning (may already be connected):',
        e.message,
      );
    }

    // Clean up any stale data from previous test runs
    await prisma.refreshToken.deleteMany({
      where: { user: { login: TEST_USER.login } },
    });
    await prisma.transaction.deleteMany({
      where: { user: { login: TEST_USER.login } },
    });
    await prisma.singleData.deleteMany({
      where: { user: { login: TEST_USER.login } },
    });

    // Create or update the test user
    const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
    const user = await prisma.user.upsert({
      where: { email: TEST_USER.email },
      update: { login: TEST_USER.login, password: hashedPassword },
      create: {
        email: TEST_USER.email,
        login: TEST_USER.login,
        password: hashedPassword,
      },
    });
    testUserId = user.id;

    // Authenticate to get JWT + refresh tokens
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: TEST_USER.login, password: TEST_USER.password });
    authToken = loginRes.body.accessToken;
    refreshToken = loginRes.body.refreshToken;
  });

  afterEach(async () => {
    await prisma.singleData.deleteMany({ where: { userId: testUserId } });
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
  });

  afterAll(async () => {
    // Clean up all test user data
    await prisma.refreshToken.deleteMany({
      where: { user: { login: TEST_USER.login } },
    });
    await prisma.transaction.deleteMany({
      where: { user: { login: TEST_USER.login } },
    });
    await prisma.singleData.deleteMany({
      where: { user: { login: TEST_USER.login } },
    });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
    await app.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // Auth endpoints
  // ────────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('should reject invalid API credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: 'test', password: 'wrong' })
        .expect(401);

      expect(res.body.message).toBe('Invalid API credentials');
    });

    it('should authenticate with email + password (front-end mode)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: '12345678' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject invalid email/password credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
        .expect(401);

      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should rotate token and return new pair', async () => {
      const oldAccess = authToken;
      const oldRefresh = refreshToken;

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefresh })
        .expect(200);

      const decodedNew = jwt.decode(res.body.accessToken);
      const decodedOld = jwt.decode(oldAccess);

      expect(decodedNew.jti).not.toBe(decodedOld.jti);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      expect(res.body.accessToken).not.toBe(oldAccess);
      expect(res.body.refreshToken).not.toBe(oldRefresh);

      // Update global tokens for subsequent tests
      authToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should reject an already-used refresh token (replay detection)', async () => {
      // Login fresh to get a new refresh token
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: TEST_USER.login, password: TEST_USER.password })
        .expect(200);

      expect(loginRes.body.refreshToken).toBeDefined();

      const tokenToReplay = loginRes.body.refreshToken;

      // Use it once — should succeed
      const firstRefresh = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokenToReplay })
        .expect(200);

      // Try to reuse the SAME token — should fail (replay attack)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokenToReplay })
        .expect(401);

      // Even the new token from first rotation should now be revoked
      // (because the family was revoked on replay detection)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: firstRefresh.body.refreshToken })
        .expect(401);
    });

    it('should reject empty/missing refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401);

      expect(res.body.message).toBe('Refresh token is required');
    });
  });

  describe('POST /auth/logout', () => {
    it('should revoke refresh tokens so they cannot be reused', async () => {
      // Login fresh for this test
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: TEST_USER.login, password: TEST_USER.password })
        .expect(200);

      expect(loginRes.body.accessToken).toBeDefined();
      expect(loginRes.body.refreshToken).toBeDefined();

      const testAccess = loginRes.body.accessToken;
      const testRefresh = loginRes.body.refreshToken;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${testAccess}`)
        .expect(200);

      // Refresh token should now be invalid
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: testRefresh })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user with a valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.login).toBe('test');
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should reject without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Transactions endpoints
  // ────────────────────────────────────────────────────────────────────

  // endpoint /transactions
  it('POST /transactions → should create and return 201 with the transaction', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 200, type: 'debit' })
      .expect(201);

    expect(response.body).toMatchObject({
      amount: 200,
      type: 'debit',
      userId: expect.any(Number),
      hash: expect.any(String),
    });
  });

  it('GET /transactions/:hash → should return 404 for non-existent hash', async () => {
    const res = await request(app.getHttpServer())
      .get('/transactions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(res.body.message).toBe('Transaction not found');
  });

  it('CRUD /transactions: create → read → update → delete → verify deleted', async () => {
    // CREATE
    const createRes = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 500, type: 'credit' })
      .expect(201);
    const { hash } = createRes.body;

    // READ
    await request(app.getHttpServer())
      .get(`/transactions/${hash}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => expect(res.body.amount).toBe(500));

    // UPDATE
    await request(app.getHttpServer())
      .put(`/transactions/${hash}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 750 })
      .expect(200)
      .expect((res) => expect(res.body.amount).toBe(750));

    // DELETE
    await request(app.getHttpServer())
      .delete(`/transactions/${hash}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // VERIFY DELETED
    await request(app.getHttpServer())
      .get(`/transactions/${hash}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  // ────────────────────────────────────────────────────────────────────
  // Single Data endpoints
  // ────────────────────────────────────────────────────────────────────

  // endpoint /single-data
  it('POST /single-data → should create and return 201 with the transaction', async () => {
    const response = await request(app.getHttpServer())
      .post('/single-data')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Testing title',
        description: 'Testing description',
        amount: 1,
        type: 'story',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      title: 'Testing title',
      description: 'Testing description',
      amount: 1,
      type: 'story',
      userId: expect.any(Number),
    });
  });

  it('GET /single-data/:id → should return 404 for non-existent id', async () => {
    const res = await request(app.getHttpServer())
      .get('/single-data/99999999')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(res.body.message).toBe('SingleData not found');
  });

  it('CRUD /single-data: create → read → update → delete → verify deleted', async () => {
    // CREATE
    const createRes = await request(app.getHttpServer())
      .post('/single-data')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Testing title',
        description: 'Testing description',
        amount: 100,
        type: 'transaction',
      })
      .expect(201);
    const { id } = createRes.body;

    // READ
    await request(app.getHttpServer())
      .get(`/single-data/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => expect(res.body.amount).toBe(100))
      .expect((res) => expect(res.body.type).toBe('transaction'));

    // UPDATE
    await request(app.getHttpServer())
      .put(`/single-data/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 750 })
      .expect(200)
      .expect((res) => expect(res.body.amount).toBe(750));

    // DELETE
    await request(app.getHttpServer())
      .delete(`/single-data/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // VERIFY DELETED
    await request(app.getHttpServer())
      .get(`/single-data/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
