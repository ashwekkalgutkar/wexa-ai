import express from 'express';
import cors from 'cors';
import apiRoutes from '../backend/src/routes/api';

const app = express();

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// API Routes (mounted both at / and /api for flexible serverless rewrites)
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Six Degrees API' });
});

// Centralized Error Handling Middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Backend Error]:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

export default app;
