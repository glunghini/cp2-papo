import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireUid } from '../middleware/authenticate';
import { notifyMessage } from '../services/messageNotifications';
import { conversationIdSchema, messageIdSchema } from '../utils/ids';

export const notificationsRouter = Router();

const messageBody = z.object({
  conversationId: conversationIdSchema,
  messageId: messageIdSchema,
});

// O corpo traz só os ids. Destinatários são sempre calculados no servidor.
notificationsRouter.post('/messages', authenticate, async (req, res) => {
  const uid = requireUid(req);
  const { conversationId, messageId } = messageBody.parse(req.body);
  const result = await notifyMessage({ conversationId, messageId, requesterUid: uid });
  res.status(200).json(result);
});
