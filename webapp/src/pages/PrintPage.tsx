import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../app/auth';
import { useNotification } from '../hooks/useNotification';
import { processVisit, pushBackVisit } from '../services/visits';
import { formatDisplayDateTime } from '../utils/date';
import { removeEmptyObjectValues } from '../utils/forms';
import type { Visit } from '../types/domain';

export default function PrintPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const visit = useMemo(() => location.state as Visit & { from?: string }, [location.state]);

  if (!visit) {
    return (
      <section className="card pad-1">
        <p className="muted">No visit selected for printing.</p>
      </section>
    );
  }

  const handlePushBack = async () => {
    try {
      setIsLoading(true);
      await pushBackVisit(visit);
      navigate('/queue');
    } catch {
      notify('Unable to push back visit', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async () => {
    const cleanedVisit: Visit = {
      ...visit,
      profile: {
        ...visit.profile,
        exams: removeEmptyObjectValues(visit.profile.exams) as typeof visit.profile.exams,
      },
    };

    if (visit.from === 'search') {
      window.print();
      navigate('/search');
      return;
    }

    if (visit.from === 'reports') {
      window.print();
      navigate('/reports');
      return;
    }

    try {
      setIsLoading(true);
      const response = await processVisit({ ...cleanedVisit, type: 'OPD' });
      window.print();

      if (response.success) {
        notify('OPD Visit processed', 'success');
      } else {
        notify(response.message ?? 'Error processing visit', 'error');
      }

      navigate('/queue');
    } catch {
      window.print();
      notify('Error processing visit', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="print-page">
      <div className="actions print-actions">
        <button
          className="button button--ghost"
          disabled={isLoading || visit.from === 'search' || visit.from === 'reports'}
          onClick={() => void handlePushBack()}
          type="button"
        >
          Push Back
        </button>
        <button
          className="button button--primary"
          disabled={isLoading}
          onClick={() => void handlePrint()}
          type="button"
        >
          Print
        </button>
      </div>

      <section className="print-sheet">
        <div className="print-header">
          <div className="print-header__details print-header__details--left">
            <p>
              <strong>Name:</strong> {visit.patient.firstName} {visit.patient.lastName}
            </p>
            <p>
              <strong>Patient Id:</strong> {visit.patient.patientId}
            </p>
            <p>
              <strong>Visit Date:</strong> {formatDisplayDateTime(visit.visitDate)}
            </p>
          </div>
          <div className="print-header__logo">
            <img src="/assets/images/logo-warm.png" alt="Suhrit Logo" />
          </div>
          <div className="print-header__details print-header__details--right">
            <p className="print-header__doctor">
              <strong>{user?.tenant?.printLine1 ?? ''}</strong>
            </p>
            <p>{user?.tenant?.printLine2 ?? ''}</p>
            <p>{user?.tenant?.printLine3 ?? ''}</p>
          </div>
        </div>

        <h3>Medicines</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Days</th>
                <th>Frequency</th>
                <th>Meal</th>
                <th>Instructions</th>
              </tr>
            </thead>
            <tbody>
              {visit.medicines.length > 0 ? (
                visit.medicines.map((medicine, index) => (
                  <tr key={`${medicine.name}-${index}`}>
                    <td>{medicine.name}</td>
                    <td>{medicine.days}</td>
                    <td>{medicine.frequency}</td>
                    <td>{medicine.meal}</td>
                    <td>{medicine.otherIns}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No Medicines prescribed</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h3>Aasan</h3>
        <div className="tag-list">
          {visit.aasans.length > 0 ? (
            visit.aasans.map((item) => <span key={item} className="tag">{item}</span>)
          ) : (
            <p className="muted">No Aasans prescribed</p>
          )}
        </div>

        <h3>Pathya (यह खाएँ)</h3>
        <div className="tag-list">
          {visit.pathya.length > 0 ? (
            visit.pathya.map((item) => <span key={item} className="tag">{item}</span>)
          ) : (
            <p className="muted">No Diet prescribed</p>
          )}
        </div>

        <h3>Apathya (यह ना खाएँ)</h3>
        <div className="tag-list">
          {visit.apathya.length > 0 ? (
            visit.apathya.map((item) => <span key={item} className="tag">{item}</span>)
          ) : (
            <p className="muted">No Diet prescribed</p>
          )}
        </div>

        <div className="mt-1">
          <strong>General Instructions</strong>
          <p className="muted">अन्न का सेवन केवल दो समय ही करें</p>
          <p className="muted">भोजन शांति से चबाएँ एवं कम से कम बीस मिनिट लें</p>
          <p className="muted">चालीस मिनिट कम से कम सैर अवश्य करें</p>
          <p className="muted">शौच में ज़ोर ना लगाएँ</p>
          <p className="muted">इस पर्ची को हमेशा साथ लाए</p>
        </div>
      </section>
    </div>
  );
}
