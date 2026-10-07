import { Router } from 'express';

import { firestore } from '../services/firebaseAdmin';

export const healthRouter = Router();

const startedAt = Date.now();

healthRouter.get('/health', async (req, res) => {
  const body: Record<string, unknown> = {
    status: 'ok',
    service: 'papo-api',
    time: new Date().toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  };

  // /health?deep=1 também testa a conexão com o Firestore
  if (req.query.deep === '1') {
    try {
      await firestore.collection('notificationDispatches').limit(1).get();
      body.firebase = 'ok';
    } catch {
      body.status = 'degraded';
      body.firebase = 'error';
    }
  }

  res.status(body.status === 'ok' ? 200 : 503).json(body);
});
