import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiRouter } from './routes.js';

const here = path.dirname(fileURLToPath(import.meta.url)); // backend/src

export function createApp() {
  const app = express();

  // Behind Render's TLS proxy — needed for secure cookies to be sent.
  if (env.isProd) app.set('trust proxy', 1);

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '12mb' })); // base64 uploads exceed the default 100kb
  app.use(cookieParser());

  app.use('/api', apiRouter);

  // In production, this one server also serves the built React app (single container).
  if (env.isProd) {
    const clientDir = path.resolve(here, '../../frontend/dist');
    app.use(express.static(clientDir));
    // SPA fallback: any non-/api GET returns index.html so client-side routing works.
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
