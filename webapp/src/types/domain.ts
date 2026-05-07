export interface TenantPrintDetails {
  printLine1?: string;
  printLine2?: string;
  printLine3?: string;
}

export interface AuthenticatedUser {
  role?: string;
  tenant?: TenantPrintDetails;
  [key: string]: unknown;
}

export interface Patient {
  patientId: string;
  firstName: string;
  lastName: string;
  address: string;
  age: number;
  dateofbirth: string;
  email: string;
  mobile: string;
  gender: string;
}

export interface Medicine {
  name: string;
  days: number;
  frequency: string;
  meal: string;
  otherIns: string;
}

export interface Exams {
  [key: string]: string;
}

export interface Readings {
  [key: string]: string;
}

export interface VisitProfile {
  reason: string;
  curMedcine: string;
  diagnosis: string;
  lastVisitDate?: string;
  exams: Exams;
  readings: Readings;
  history: string[];
  tags: string[];
  notes: string;
}

export interface Visit {
  patient: Patient;
  type: string;
  visitId: number;
  visitDate: string;
  lastVisitDate: string;
  opdPayment: number;
  profile: VisitProfile;
  medicines: Medicine[];
  pathya: string[];
  apathya: string[];
  karms: string[];
  aasans: string[];
}

export interface KarmaVisit {
  patient: Patient;
  type: string;
  visitId: number;
  visitDate: string;
  payment: number;
  karms: Record<string, number>;
  state: boolean;
}

export interface PatientHistoryPayload {
  visits: Visit[];
  kvisits: KarmaVisit[];
}

export interface QueueVisit {
  patient: Patient;
  type: string;
  visitId: number;
  visitDate: string;
  lastVisitDate?: string;
  opdPayment?: number;
  payment?: number;
  profile?: VisitProfile;
  medicines?: Medicine[];
  pathya?: string[];
  apathya?: string[];
  karms?: string[] | Record<string, number>;
  aasans?: string[];
  state?: boolean;
}

export interface ReportVisitRow {
  patientId: number;
  opdPayment: number;
  firstName: string;
  lastName: string;
}

export interface ReportKarmaRow {
  patientId: number;
  payment: number;
  firstName: string;
  lastName: string;
  karms: Record<string, number>;
}

export interface ReportPayload {
  totalOpdPayments: number;
  totalKarmaPayments: number;
  totalVisits: number;
  totalKVisits: number;
  visitsList?: ReportVisitRow[];
  kvisitsList?: ReportKarmaRow[];
}

export type SearchMode = 'patientId' | 'mobile' | 'name';
