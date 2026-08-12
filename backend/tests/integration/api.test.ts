import request from 'supertest';
import express from 'express';
import apiRoutes from '../../src/routes/api';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('API Route Integration Tests (Supertest)', () => {
  it('GET /api/status - returns DB status response', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tested');
  });

  it('GET /api/path - valid artists returns shortest path JSON', async () => {
    const res = await request(app).get('/api/path?artistA=Kanye%20West&artistB=Daft%20Punk');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('chain');
    expect(res.body).toHaveProperty('links');
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/path - missing parameters triggers Zod 400 validation error', async () => {
    const res = await request(app).get('/api/path?artistA=Kanye%20West');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation Error');
  });

  it('GET /api/artist/:name - returns neighborhood graph JSON', async () => {
    const res = await request(app).get('/api/artist/Daft%20Punk');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('artist');
    expect(res.body).toHaveProperty('neighbors');
  });

  it('GET /api/hubs - returns top central hub artists', async () => {
    const res = await request(app).get('/api/hubs?limit=5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(5);
  });

  it('GET /api/bridges - returns cross-genre bridge artists', async () => {
    const res = await request(app).get('/api/bridges?limit=5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
