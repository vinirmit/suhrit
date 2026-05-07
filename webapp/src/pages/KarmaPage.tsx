import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Constants from '../constants/legacy-constants';
import { useNotification } from '../hooks/useNotification';
import { processVisit, updateVisit } from '../services/visits';
import type { KarmaVisit } from '../types/domain';

function createDefaultVisit(): KarmaVisit {
  return {
    patient: {
      patientId: '',
      firstName: '',
      lastName: '',
      address: '',
      age: 0,
      dateofbirth: '',
      email: '',
      mobile: '',
      gender: '',
    },
    type: '',
    visitId: 0,
    payment: 0,
    visitDate: '',
    karms: {},
    state: false,
  };
}

export default function KarmaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const initialVisit = useMemo(
    () => ((location.state as KarmaVisit | null) ?? createDefaultVisit()),
    [location.state],
  );
  const [visit, setVisit] = useState<KarmaVisit>(() => ({
    ...createDefaultVisit(),
    ...initialVisit,
    karms: initialVisit.karms ?? {},
  }));

  const toggleKarm = (name: string) => {
    setVisit((current) => {
      if (Object.prototype.hasOwnProperty.call(current.karms, name)) {
        const next = { ...current.karms };
        delete next[name];
        return { ...current, karms: next };
      }

      return {
        ...current,
        karms: { ...current.karms, [name]: 0 },
      };
    });
  };

  const saveState = async (state: boolean, successMessage: string) => {
    try {
      const response = await updateVisit({ ...visit, state });

      if (response.success === false) {
        notify(response.message ?? 'Unable to update karma visit', 'error');
        return;
      }

      notify(successMessage, 'success');
      navigate('/queue');
    } catch {
      notify('Unable to update karma visit', 'error');
    }
  };

  const submitVisit = async () => {
    try {
      const response = await processVisit({ ...visit, type: 'kvisit' });

      if (response.success) {
        navigate('/queue');
        return;
      }

      notify(response.message ?? 'Error processing visit', 'error');
    } catch {
      notify('Error processing visit', 'error');
    }
  };

  const total = Object.values(visit.karms).reduce((sum, value) => sum + value, 0);

  return (
    <>
      <section className="section-header">
        <div>
          <h2 className="section-title">Karma</h2>
          <p className="muted">
            {visit.patient.firstName} {visit.patient.lastName}
          </p>
        </div>
      </section>

      <section className="card pad-1">
        {!visit.state ? (
          <>
            <div className="tag-list">
              {(Constants.karms as string[]).map((item) => (
                <button
                  key={item}
                  className={Object.prototype.hasOwnProperty.call(visit.karms, item) ? 'tag tag--active' : 'tag'}
                  onClick={() => toggleKarm(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="actions mt-1">
              <button
                className="button button--ghost"
                onClick={() => void saveState(false, 'Karma Visit saved')}
                type="button"
              >
                Save
              </button>
              <button
                className="button button--primary"
                onClick={() => void saveState(true, 'Karma Visit concluded')}
                type="button"
              >
                Conclude
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid">
              {Object.entries(visit.karms).map(([key, value]) => (
                <label className="field" key={key}>
                  <span className="field__label">{key}</span>
                  <input
                    className="field__control"
                    inputMode="numeric"
                    value={value}
                    onChange={(event) =>
                      setVisit((current) => {
                        const nextKarms = {
                          ...current.karms,
                          [key]: Number(event.target.value) || 0,
                        };
                        const nextTotal = Object.values(nextKarms).reduce(
                          (sum, amount) => sum + amount,
                          0,
                        );

                        return {
                          ...current,
                          payment: nextTotal,
                          karms: nextKarms,
                        };
                      })
                    }
                  />
                </label>
              ))}
              <div className="surface pad-1">
                <strong>Total</strong>
                <p className="muted">{total}</p>
              </div>
            </div>
            <div className="actions mt-1">
              <button
                className="button button--ghost"
                onClick={() => void saveState(false, 'Karma Visit pushed back')}
                type="button"
              >
                Push Back
              </button>
              <button
                className="button button--primary"
                onClick={() => void submitVisit()}
                type="button"
              >
                Submit
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
