import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * API Integration (E2E) Tests
 *
 * These tests require a running Postgres and Redis.
 * They are intentionally skipped unless DATABASE_URL points to a real test DB.
 *
 * In CI they run in the e2e-api job that spins up services.
 * Locally: ensure docker-compose.yml is up before running.
 */

const SKIP = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost:5432') === false
  ? false // run when DATABASE_URL is set to any host
  : false; // always run when DATABASE_URL is present

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  // ── Health ─────────────────────────────────────────────────
  it('GET /api/health → 200', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // ── Register ──────────────────────────────────────────────
  let token: string;
  const email = `e2e_${Date.now()}@example.com`;

  it('POST /api/v1/auth/register → 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'E2E User', email, password: 'Password123!' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
    token = res.body.token as string;
  });

  it('POST /api/v1/auth/register duplicate → 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'E2E User', email, password: 'Password123!' });

    expect(res.status).toBe(409);
  });

  // ── Login ─────────────────────────────────────────────────
  it('POST /api/v1/auth/login → 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });

  it('POST /api/v1/auth/login wrong password → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  // ── Me ────────────────────────────────────────────────────
  it('GET /api/v1/auth/me → 200 with valid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
  });

  it('GET /api/v1/auth/me → 401 without token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  // ── Forgot password ───────────────────────────────────────
  it('POST /api/v1/auth/forgot-password → 201 (silent, no email reveal)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/if that email/i);
  });

  it('POST /api/v1/auth/reset-password invalid token → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: 'invalidtoken', password: 'NewPassword123!' });

    expect(res.status).toBe(400);
  });

  // ── Creators (auth required) ──────────────────────────────
  it('GET /api/v1/creators → 401 without token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/creators');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/creators → 200 with token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/creators')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  // ── Campaigns ─────────────────────────────────────────────
  it('GET /api/v1/campaigns → 200 with token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
  });

  // ── Notifications ─────────────────────────────────────────
  it('GET /api/v1/notifications → 200 with token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
  });
});
