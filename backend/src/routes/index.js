import { Router } from 'express';
import { estimateRouter } from './estimate.js';
import { importRouter } from './importCsv.js';
import { projectsRouter } from './projects.js';
import { referenceRouter } from './reference.js';
import { storeKind } from '../repositories/projectRepository.js';

export const apiRouter = Router();

/** Directory of the API — what you get if you open /api in a browser. */
export const API_ENDPOINTS = [
  'GET  /api/health',
  'GET  /api/reference',
  'POST /api/estimate',
  'POST /api/import/csv',
  'GET  /api/import/template',
  'GET  /api/projects',
  'POST /api/projects',
  'GET  /api/projects/:id',
  'PUT  /api/projects/:id',
  'DELETE /api/projects/:id',
  'POST /api/projects/:id/estimate',
];

apiRouter.get('/', (req, res) => {
  res.json({
    name: 'Voltwise API',
    docs: '/api/health',
    endpoints: API_ENDPOINTS,
    ui: 'Build the web app (npm run build) to serve it from this same port at /',
  });
});

apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    store: storeKind(),
    version: '1.0.0',
  });
});

apiRouter.use('/reference', referenceRouter);
apiRouter.use('/estimate', estimateRouter);
apiRouter.use('/import', importRouter);
apiRouter.use('/projects', projectsRouter);
