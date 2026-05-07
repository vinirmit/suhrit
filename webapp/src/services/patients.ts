import { z } from 'zod';

import { http } from './http';
import type { Patient, PatientHistoryPayload, Visit } from '../types/domain';

const patientSchema = z.custom<Patient>();
const patientsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  payload: z.array(patientSchema).optional(),
});

const visitResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  payload: z.custom<Visit>().optional(),
});

const patientHistoryResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  payload: z.custom<PatientHistoryPayload>().optional(),
});

export interface RegisterPatientPayload {
  patient: {
    patientId?: string;
    firstName: string;
    lastName: string;
    dateofbirth: string | null;
    gender: string;
    address: string;
    mobile: string;
    email?: string;
  };
  payment?: number;
}

export async function searchPatients(
  payload: Record<string, string | number>,
): Promise<Patient[]> {
  const response = await http.post<
    z.infer<typeof patientsResponseSchema>,
    Record<string, string | number>
  >('/patient/search', payload);
  const parsed = patientsResponseSchema.parse(response);
  return parsed.success ? parsed.payload ?? [] : [];
}

export async function registerPatient(
  payload: RegisterPatientPayload,
): Promise<z.infer<typeof patientsResponseSchema>> {
  return http.post('/patient/register', payload);
}

export async function editPatient(
  payload: Pick<RegisterPatientPayload, 'patient'>,
): Promise<z.infer<typeof patientsResponseSchema>> {
  return http.post('/patient/edit', payload);
}

export async function fetchLastVisit(patientId: number): Promise<Visit | null> {
  const response = await http.post<
    z.infer<typeof visitResponseSchema>,
    { patientId: number }
  >('/patient/lastvisit', { patientId });
  const parsed = visitResponseSchema.parse(response);
  return parsed.success ? parsed.payload ?? null : null;
}

export async function fetchPatientHistory(
  patientId: string | number,
): Promise<PatientHistoryPayload | null> {
  const response = await http.post<
    z.infer<typeof patientHistoryResponseSchema>,
    { patientId: string | number }
  >('/patient/history', { patientId });
  const parsed = patientHistoryResponseSchema.parse(response);
  return parsed.payload ?? null;
}
