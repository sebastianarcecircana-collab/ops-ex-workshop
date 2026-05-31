import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { loadEnv } from './config/loadEnv';
import { applyMigrations } from './db/migrate';

import { loadMissionSpec } from './services/missionSpec';
import { ensureBucketAndSeedFiles } from './services/minio';

import cohortsRouter from './routes/cohorts';
import teamsRouter from './routes/teams';
import gatesRouter from './routes/gates';
import scenarioRouter from './routes/scenario';
import assetsRouter from './routes/assets';
import adminRouter from './routes/admin';

const app = express();

loadEnv();

const PORT = parseInt(process.env.PORT || '3001', 10);

// Security + parsing middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '512kb' }));

// Routes
app.use('/api/cohorts', cohortsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/gates', gatesRouter);
app.use('/api/scenario', scenarioRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  // Ensure schema exists for fresh environments before serving requests.
  await applyMigrations();

  // Load mission spec eagerly (fails fast if YAML is missing/invalid)
  loadMissionSpec();

  // Ensure MinIO bucket exists and Gate 3 CSV is uploaded
  try {
    await ensureBucketAndSeedFiles();
  } catch (err) {
    console.warn('MinIO setup failed (non-fatal in dev):', (err as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
