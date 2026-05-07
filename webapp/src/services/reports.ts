import { z } from 'zod';

import { http } from './http';
import type { ReportPayload } from '../types/domain';

const reportResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  payload: z.custom<ReportPayload>().optional(),
});

export async function fetchRangeReport(payload: {
  start_date: string;
  end_date: string;
}): Promise<ReportPayload | null> {
  const response = await http.post<
    z.infer<typeof reportResponseSchema>,
    { start_date: string; end_date: string }
  >('/report/range', payload);
  const parsed = reportResponseSchema.parse(response);
  return parsed.success ? parsed.payload ?? null : null;
}

