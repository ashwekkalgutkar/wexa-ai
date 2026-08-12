import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import { testConnection, closeDriver } from './config/db';

dotenv.config({ path: '../.env' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Six Degrees API' });
});

// Centralized Express Error Handling Middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Backend Error]:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

async function startServer() {
  console.log('--- Starting Six Degrees Backend Service ---');
  
  // Test DB connection asynchronously
  testConnection().then(status => {
    if (status.connected) {
      console.log(`[CognoDB Status] Connected to ${status.uri}`);
    } else {
      console.warn(`[CognoDB Status] Running with database notice: ${status.error}`);
      console.warn('[CognoDB Status] Live fallback mode active until valid CognoDB URI is configured.');
    }
  });

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`   - Graph API: http://localhost:${PORT}/api/graph`);
    console.log(`   - Health Check: http://localhost:${PORT}/health`);
  });

  // Graceful Shutdown
  const shutdown = async () => {
    console.log('\nGracefully shutting down backend server...');
    await closeDriver();
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
