import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';

import { PatientCard } from '../components/patient/PatientCard';
import { useNotification } from '../hooks/useNotification';
import { addVisitToQueue } from '../services/visits';
import { fetchLastVisit, searchPatients } from '../services/patients';
import type { Patient, SearchMode } from '../types/domain';

const searchFormSchema = z.object({
  patientId: z.string().optional(),
  mobile: z.string().optional(),
  name: z.string().optional(),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

function getSearchErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? 'Please enter a valid search value.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Search failed.';
}

function buildSearchPayload(mode: SearchMode, values: SearchFormValues) {
  if (mode === 'patientId') {
    const parsed = z
      .object({
        patientId: z
          .string()
          .min(1, 'Patient Id is required')
          .regex(/^\d+$/, 'Patient Id must be numeric'),
      })
      .parse(values);

    return {
      patientId: Number(parsed.patientId),
    };
  }

  if (mode === 'mobile') {
    return z
      .object({
        mobile: z.string().regex(/^\d{10}$/, 'Mobile Number should be 10 digits'),
      })
      .parse(values);
  }

  return z
    .object({
      name: z.string().trim().min(1, 'Patient Name is required'),
    })
    .parse(values);
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [mode, setMode] = useState<SearchMode>('patientId');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      patientId: '',
      mobile: '',
      name: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsLoading(true);
      const payload = buildSearchPayload(mode, values);
      const results = await searchPatients(payload);
      setPatients(results);

      if (results.length === 0) {
        notify('Patient Not Found', 'error');
      }
    } catch (error) {
      notify(getSearchErrorMessage(error), 'error');
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  });

  const enqueueVisit = async (patient: Patient, type: 'visit' | 'kvisit') => {
    try {
      setIsLoading(true);
      const payload =
        type === 'visit'
          ? { patient, type, opdPayment: 0 }
          : { patient, type, payment: 0 };

      const response = await addVisitToQueue(payload);

      if (response.success) {
        navigate('/queue');
        return;
      }

      notify(response.message ?? 'Unable to add visit', 'error');
    } catch {
      notify('Something went wrong, please try again later', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const printLastVisit = async (patient: Patient) => {
    try {
      setIsLoading(true);
      const visit = await fetchLastVisit(Number(patient.patientId));

      if (!visit) {
        notify('Patient last visit not found', 'error');
        return;
      }

      navigate('/print', {
        state: { ...visit, from: 'search' },
      });
    } catch {
      notify('System Error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <section className="section-header">
        <div>
          <h2 className="section-title">Search Patients</h2>
          <p className="muted">
            Search by patient id, mobile number, or patient name, then continue the same
            queue flows used in the current app.
          </p>
        </div>
      </section>

      <section className="card pad-1">
        <div className="tabs">
          {[
            ['patientId', 'Patient Id'],
            ['mobile', 'Mobile Number'],
            ['name', 'Patient Name'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={mode === value ? 'tab tab--active' : 'tab'}
              onClick={() => setMode(value as SearchMode)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="grid grid--3 mt-1">
          {mode === 'patientId' ? (
            <label className="field field--floating">
              <input
                className="field__control"
                inputMode="numeric"
                placeholder=" "
                {...register('patientId')}
              />
              <span className="field__label">Patient Id</span>
              {errors.patientId?.message ? (
                <span className="field__error">{errors.patientId.message}</span>
              ) : null}
            </label>
          ) : null}
          {mode === 'mobile' ? (
            <label className="field field--floating">
              <input
                className="field__control"
                inputMode="numeric"
                maxLength={10}
                placeholder=" "
                {...register('mobile')}
              />
              <span className="field__label">Mobile</span>
              {errors.mobile?.message ? (
                <span className="field__error">{errors.mobile.message}</span>
              ) : null}
            </label>
          ) : null}
          {mode === 'name' ? (
            <label className="field field--floating">
              <input className="field__control" placeholder=" " {...register('name')} />
              <span className="field__label">Patient Name</span>
              {errors.name?.message ? (
                <span className="field__error">{errors.name.message}</span>
              ) : null}
            </label>
          ) : null}
          <div className="actions align-end">
            <button className="button button--primary" disabled={isLoading} type="submit">
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </section>

      {patients.length > 0 ? (
        <section className="search-results-grid">
          {patients.map((patient) => (
            <PatientCard
              key={patient.patientId}
              patient={patient}
              disabled={isLoading}
              onEdit={() => navigate('/edit', { state: patient })}
              onOpenOpd={() => void enqueueVisit(patient, 'visit')}
              onOpenKarma={() => void enqueueVisit(patient, 'kvisit')}
              onPrintLastVisit={() => void printLastVisit(patient)}
            />
          ))}
        </section>
      ) : (
        <section className="card pad-1">
          <p className="muted">Search using Patient Id, Mobile Number, or Patient Name.</p>
        </section>
      )}
    </>
  );
}
