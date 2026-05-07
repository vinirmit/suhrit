import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../app/auth';
import { useNotification } from '../hooks/useNotification';
import { fetchQueue } from '../services/visits';
import type { QueueVisit } from '../types/domain';

function parseQueueTimestamp(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const hasExplicitTime = value.includes('T') || /\b\d{1,2}:\d{2}\b/.test(value);

  if (!hasExplicitTime) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getWaitingBadge(visitDate: string): { label: string; tone: string } | null {
  const queuedAt = parseQueueTimestamp(visitDate);

  if (!queuedAt) {
    return null;
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - queuedAt.getTime()) / 60000));

  if (diffMinutes < 60) {
    return {
      label: `${diffMinutes}m waiting`,
      tone: diffMinutes >= 30 ? 'queue-wait-badge queue-wait-badge--medium' : 'queue-wait-badge',
    };
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return {
    label: `${hours}h ${minutes}m waiting`,
    tone:
      diffMinutes >= 120
        ? 'queue-wait-badge queue-wait-badge--high'
        : 'queue-wait-badge queue-wait-badge--medium',
  };
}

export default function QueuePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();
  const [queue, setQueue] = useState<QueueVisit[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const visits = await fetchQueue();
        setQueue(visits);
      } catch {
        notify('Unable to load Queue', 'error');
      }
    };

    void load();
  }, [notify]);

  const grouped = useMemo(() => {
    const next = {
      visit: [] as QueueVisit[],
      kvisit: [] as QueueVisit[],
      print: [] as QueueVisit[],
    };

    queue.forEach((item) => {
      if (item.type === 'kvisit') {
        next.kvisit.push(item);
      } else if (item.type === 'print') {
        next.print.push(item);
      } else {
        next.visit.push(item);
      }
    });

    return next;
  }, [queue]);

  const openVisit = (visit: QueueVisit) => {
    if (visit.type === 'kvisit') {
      navigate('/karma', { state: visit });
      return;
    }

    if (visit.type === 'print') {
      navigate('/print', { state: visit });
      return;
    }

    if (String(user?.role ?? '').toLowerCase() === 'dr') {
      navigate('/opd', { state: visit });
      return;
    }

    navigate('/opd', { state: visit });
  };

  const getQueueTone = (title: string) => {
    if (title === 'Karma') {
      return 'queue-column queue-column--karma';
    }

    if (title === 'Prescription') {
      return 'queue-column queue-column--print';
    }

    return 'queue-column queue-column--opd';
  };

  const getQueueLabel = (title: string) => {
    if (title === 'Karma') {
      return 'Therapy Workflow';
    }

    if (title === 'Prescription') {
      return 'Ready To Print';
    }

    return 'Clinical Consultation';
  };

  const renderColumn = (title: string, items: QueueVisit[]) => (
    <section className={getQueueTone(title)}>
      <div className="queue-column__header">
        <div>
          <p className="queue-column__eyebrow">{getQueueLabel(title)}</p>
          <h3 className="queue-column__title">{title}</h3>
        </div>
        <span className="queue-column__count">{items.length}</span>
      </div>
      <div className="queue-list">
        {items.map((visit) => (
          (() => {
            const waitingBadge = getWaitingBadge(visit.visitDate);

            return (
              <button
                key={`${visit.visitId}-${visit.patient.patientId}`}
                className="queue-item"
                onClick={() => openVisit(visit)}
                type="button"
              >
                <div className="queue-item__top">
                  <div>
                    <strong className="queue-item__name">
                      {visit.patient.firstName} {visit.patient.lastName}
                    </strong>
                  </div>
                  <span className="queue-item__pill">{title}</span>
                </div>
                <div className="queue-item__meta">
                  <span>Patient ID: {visit.patient.patientId}</span>
                  <span>Age: {visit.patient.age}</span>
                  {waitingBadge ? (
                    <span className={waitingBadge.tone}>{waitingBadge.label}</span>
                  ) : null}
                </div>
                <p className="queue-item__address">{visit.patient.address}</p>
              </button>
            );
          })()
        ))}
        {items.length === 0 ? (
          <div className="queue-empty">
            <p className="muted">No visits in this queue.</p>
          </div>
        ) : null}
      </div>
    </section>
  );

  return (
    <>
      <section className="section-header">
        <div>
          <h2 className="section-title">Patient Queue</h2>
          {/* <p className="muted">Grouped exactly by visit type: OPD, Karma, and Prescription.</p> */}
        </div>
      </section>
      <div className="queue-layout">
        {renderColumn('OPD', grouped.visit)}
        {renderColumn('Karma', grouped.kvisit)}
        {renderColumn('Prescription', grouped.print)}
      </div>
    </>
  );
}
