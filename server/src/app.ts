import express from 'express';
import { rateLimit } from 'express-rate-limit';

import { errorHandler, notFound } from './middleware/errorHandler';
import { groupsRouter } from './routes/groups';
import { healthRouter } from './routes/health';
import { notificationsRouter } from './routes/notifications';
import { usersRouter } from './routes/users';

export function createApp() {
  const app = express();

  // atrás do proxy da hospedagem, o IP real vem no X-Forwarded-For
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));

  app.get('/', (_req, res) => {
    res.json({
      service: 'papo-api',
      endpoints: [
        'GET /health',
        'POST /notifications/messages',
        'POST /groups',
        'POST /groups/:groupId/members',
        'DELETE /groups/:groupId/members/:memberId',
        'POST /groups/:groupId/sync',
        'GET /users/:uid/profile',
      ],
    });
  });
  app.use(healthRouter);

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: { code: 'rate_limited', message: 'Muitas requisições. Aguarde um pouco.' } },
    }),
  );

  app.use('/notifications', notificationsRouter);
  app.use('/groups', groupsRouter);
  app.use('/users', usersRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
