import { z } from 'zod';

export const baseApiEnvelopeSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  payload: z.unknown().optional(),
  user: z.unknown().optional(),
});

export type BaseApiEnvelope = z.infer<typeof baseApiEnvelopeSchema>;

