import { z } from 'zod';

import { http } from './http';
import type { KarmaVisit, QueueVisit, Visit } from '../types/domain';

const queueResponseSchema = z.object({
  payload: z.array(z.custom<QueueVisit>()),
});

const visitMutationResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  payload: z.unknown().optional(),
});

export async function fetchQueue(): Promise<QueueVisit[]> {
  const response = await http.get<z.infer<typeof queueResponseSchema>>('/visit/queue');
  return queueResponseSchema.parse(response).payload;
}

export async function addVisitToQueue(payload: {
  patient: QueueVisit['patient'];
  type: string;
  payment?: number;
  opdPayment?: number;
}): Promise<z.infer<typeof visitMutationResponseSchema>> {
  return http.post('/visit/add', payload);
}

export async function updateVisit(
  payload: Visit | KarmaVisit,
): Promise<z.infer<typeof visitMutationResponseSchema>> {
  return http.post('/visit/update', payload);
}

export async function processVisit(
  payload: Visit | KarmaVisit,
): Promise<z.infer<typeof visitMutationResponseSchema>> {
  return http.post('/visit/process', payload);
}

export async function pushBackVisit(
  payload: Visit,
): Promise<z.infer<typeof visitMutationResponseSchema>> {
  return http.post('/visit/pushback', payload);
}

