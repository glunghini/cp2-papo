import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireUid } from '../middleware/authenticate';
import { addMembers, createGroup, removeMember, syncMembershipFor } from '../services/groupAdmin';
import { GROUP_RULES, NOTIFICATION_POLICIES } from '../types/domain';
import { groupIdSchema, uidSchema } from '../utils/ids';

export const groupsRouter = Router();

groupsRouter.use(authenticate);

const createBody = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Dê um nome ao grupo.')
    .max(GROUP_RULES.maxNameLength, `O nome pode ter até ${GROUP_RULES.maxNameLength} caracteres.`),
  memberIds: z.array(uidSchema).max(GROUP_RULES.maxLimit, 'Integrantes demais.'),
  memberLimit: z
    .number({ invalid_type_error: 'O limite precisa ser um número.' })
    .int('O limite precisa ser um número inteiro.')
    .min(GROUP_RULES.minMembers, `O limite mínimo é ${GROUP_RULES.minMembers}.`)
    .max(GROUP_RULES.maxLimit, `O limite máximo é ${GROUP_RULES.maxLimit}.`),
  notificationPolicy: z.enum(NOTIFICATION_POLICIES),
});

const addMembersBody = z.object({
  memberIds: z.array(uidSchema).min(1, 'Escolha quem será adicionado.').max(GROUP_RULES.maxLimit),
});

const groupParams = z.object({ groupId: groupIdSchema });
const memberParams = z.object({ groupId: groupIdSchema, memberId: uidSchema });

groupsRouter.post('/', async (req, res) => {
  const ownerId = requireUid(req);
  const body = createBody.parse(req.body);
  const groupId = await createGroup({ ownerId, ...body });
  res.status(201).json({ groupId });
});

groupsRouter.post('/:groupId/members', async (req, res) => {
  const uid = requireUid(req);
  const { groupId } = groupParams.parse(req.params);
  const { memberIds } = addMembersBody.parse(req.body);
  const members = await addMembers(uid, groupId, memberIds);
  res.status(200).json({ groupId, memberIds: members });
});

groupsRouter.delete('/:groupId/members/:memberId', async (req, res) => {
  const uid = requireUid(req);
  const { groupId, memberId } = memberParams.parse(req.params);
  const members = await removeMember(uid, groupId, memberId);
  res.status(200).json({ groupId, memberIds: members });
});

groupsRouter.post('/:groupId/sync', async (req, res) => {
  const uid = requireUid(req);
  const { groupId } = groupParams.parse(req.params);
  const members = await syncMembershipFor(uid, groupId);
  res.status(200).json({ groupId, memberIds: members });
});
