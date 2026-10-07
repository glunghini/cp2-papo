import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireUid } from '../middleware/authenticate';
import { getSharedProfile } from '../services/profileAccess';
import { uidSchema } from '../utils/ids';

export const usersRouter = Router();

const profileParams = z.object({ uid: uidSchema });

usersRouter.get('/:uid/profile', authenticate, async (req, res) => {
  const viewerUid = requireUid(req);
  const { uid } = profileParams.parse(req.params);
  const profile = await getSharedProfile(viewerUid, uid);
  res.status(200).json(profile);
});
