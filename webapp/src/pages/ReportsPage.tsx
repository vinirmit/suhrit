import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useNotification } from '../hooks/useNotification';
import { fetchLastVisit } from '../services/patients';
import { fetchRangeReport } from '../services/reports';
import type { ReportPayload } from '../types/domain';

const emptyReport: ReportPayload = {
  totalOpdPayments: 0,
  totalKarmaPayments: 0,
  totalVisits: 0,
  totalKVisits: 0,
  visitsList: [],
  kvisitsList: [],
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<ReportPayload>(emptyReport);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const response = await fetchRangeReport({
        start_date: startDate,
        end_date: endDate,
      });

      if (!response) {
        notify('Error processing report', 'error');
        return;
      }

      setReport({
        ...emptyReport,
        ...response,
        visitsList: response.visitsList ?? [],
        kvisitsList: response.kvisitsList ?? [],
      });
      notify('Report Generated', 'success');
    } catch {
      notify('Error processing report', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const printVisit = async (patientId: number) => {
    try {
      setIsLoading(true);
      const visit = await fetchLastVisit(patientId);

      if (!visit) {
        notify('System Error', 'error');
        return;
      }

      navigate('/print', {
        state: { ...visit, from: 'reports' },
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
          <h2 className="section-title">Reports</h2>
          {/* <p className="muted">The date-range request and report payload remain unchanged.</p> */}
        </div>
      </section>

      <section className="card pad-1">
        <div className="grid grid--3">
          <label className="field">
            <span className="field__label">Start Date</span>
            <input
              className="field__control"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">End Date</span>
            <input
              className="field__control"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <div className="actions align-end">
            <button className="button button--primary" onClick={() => void loadReport()} type="button">
              {isLoading ? 'Loading...' : 'Get Report'}
            </button>
          </div>
        </div>

        <div className="stats mt-1">
          <div className="surface stat">
            <p className="muted">Total OPD Visits</p>
            <h3>{report.totalVisits}</h3>
          </div>
          <div className="surface stat">
            <p className="muted">Total OPD Payment</p>
            <h3>{report.totalOpdPayments}</h3>
          </div>
          <div className="surface stat">
            <p className="muted">Total Karma Visits</p>
            <h3>{report.totalKVisits}</h3>
          </div>
          <div className="surface stat">
            <p className="muted">Total Karma Payment</p>
            <h3>{report.totalKarmaPayments}</h3>
          </div>
        </div>
      </section>

      <div className="grid grid--2">
        <section className="card pad-1">
          <h3>OPD Visits</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient Id</th>
                  <th>Name</th>
                  <th>Payment</th>
                  <th>Print</th>
                </tr>
              </thead>
              <tbody>
                {(report.visitsList ?? []).map((visit) => (
                  <tr key={`${visit.patientId}-${visit.firstName}`}>
                    <td>{visit.patientId}</td>
                    <td>
                      {visit.firstName} {visit.lastName}
                    </td>
                    <td>{visit.opdPayment}</td>
                    <td>
                      <button
                        className="button button--ghost"
                        onClick={() => void printVisit(visit.patientId)}
                        type="button"
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card pad-1">
          <h3>Karma Visits</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient Id</th>
                  <th>Name</th>
                  <th>Payment</th>
                  <th>Karms</th>
                </tr>
              </thead>
              <tbody>
                {(report.kvisitsList ?? []).map((visit) => (
                  <tr key={`${visit.patientId}-${visit.firstName}`}>
                    <td>{visit.patientId}</td>
                    <td>
                      {visit.firstName} {visit.lastName}
                    </td>
                    <td>{visit.payment}</td>
                    <td>
                      {Object.entries(visit.karms).map(([key, value]) => (
                        <div key={key}>
                          {key}: {value}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
