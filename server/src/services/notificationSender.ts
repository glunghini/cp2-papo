import { z } from 'zod';

import { env } from '../config/env';
import { disableDevices } from './deviceRepository';

// O Expo Push Service entrega pelo FCM no Android (credencial FCM v1 cadastrada no EAS)
// e pelo APNs no iOS.
const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const SEND_CHUNK = 100;
const RECEIPT_CHUNK = 300;
const RECEIPT_DELAY_MS = 15_000;
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

export type PushTarget = {
  devicePath: string;
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
};

export type SendOutcome = {
  accepted: number;
  failed: number;
  invalidDevicePaths: string[];
};

const errorDetails = z.object({ error: z.string().optional() }).passthrough().optional();

const ticketSchema = z.union([
  z.object({ status: z.literal('ok'), id: z.string() }),
  z.object({ status: z.literal('error'), message: z.string().optional(), details: errorDetails }),
]);

const sendResponseSchema = z.object({ data: z.array(ticketSchema) });

const receiptSchema = z.union([
  z.object({ status: z.literal('ok') }).passthrough(),
  z.object({ status: z.literal('error'), message: z.string().optional(), details: errorDetails }),
]);

const receiptsResponseSchema = z.object({ data: z.record(z.string(), receiptSchema) });

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function headers(): Record<string, string> {
  const base: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (env.expoAccessToken) base.Authorization = `Bearer ${env.expoAccessToken}`;
  return base;
}

function toExpoMessage(target: PushTarget) {
  return {
    to: target.token,
    title: target.title,
    body: target.body,
    data: target.data,
    sound: 'default',
    channelId: 'messages',
    priority: 'high',
  };
}

async function checkReceipts(ticketToDevice: Map<string, string>): Promise<void> {
  const invalid: string[] = [];
  for (const ids of chunk(Array.from(ticketToDevice.keys()), RECEIPT_CHUNK)) {
    const response = await fetch(RECEIPTS_URL, { method: 'POST', headers: headers(), body: JSON.stringify({ ids }) });
    if (!response.ok) continue;
    const parsed = receiptsResponseSchema.safeParse(await response.json());
    if (!parsed.success) continue;
    Object.entries(parsed.data.data).forEach(([ticketId, receipt]) => {
      if (receipt.status !== 'error') return;
      const devicePath = ticketToDevice.get(ticketId);
      if (receipt.details?.error === 'DeviceNotRegistered' && devicePath) {
        invalid.push(devicePath);
      } else {
        console.warn(`[push] recibo com erro: ${receipt.details?.error ?? receipt.message ?? 'desconhecido'}`);
      }
    });
  }
  await disableDevices(invalid);
}

/**
 * O Expo só confirma a entrega ao FCM/APNs alguns segundos depois. A consulta
 * dos recibos roda em segundo plano para não segurar a resposta da API.
 */
function scheduleReceiptCheck(ticketToDevice: Map<string, string>): void {
  const timer = setTimeout(() => {
    checkReceipts(ticketToDevice).catch((error: unknown) => {
      console.warn('[push] falha ao consultar recibos', error);
    });
  }, RECEIPT_DELAY_MS);
  timer.unref();
}

export async function sendPushNotifications(targets: PushTarget[]): Promise<SendOutcome> {
  const invalidDevicePaths: string[] = [];
  const validTargets = targets.filter((target) => {
    if (EXPO_TOKEN.test(target.token)) return true;
    invalidDevicePaths.push(target.devicePath);
    return false;
  });

  let accepted = 0;
  let failed = 0;
  const ticketToDevice = new Map<string, string>();

  for (const batch of chunk(validTargets, SEND_CHUNK)) {
    const response = await fetch(SEND_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(batch.map(toExpoMessage)),
    });

    if (!response.ok) {
      failed += batch.length;
      console.error(`[push] serviço respondeu ${response.status}`);
      continue;
    }

    const parsed = sendResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      failed += batch.length;
      console.error('[push] resposta inesperada do serviço de push');
      continue;
    }

    parsed.data.data.forEach((ticket, index) => {
      const target = batch[index];
      if (!target) return;
      if (ticket.status === 'ok') {
        accepted += 1;
        ticketToDevice.set(ticket.id, target.devicePath);
        return;
      }
      failed += 1;
      if (ticket.details?.error === 'DeviceNotRegistered') {
        invalidDevicePaths.push(target.devicePath);
      } else {
        console.warn(`[push] ticket com erro: ${ticket.details?.error ?? ticket.message ?? 'desconhecido'}`);
      }
    });
  }

  if (ticketToDevice.size > 0) scheduleReceiptCheck(ticketToDevice);

  return { accepted, failed, invalidDevicePaths };
}
