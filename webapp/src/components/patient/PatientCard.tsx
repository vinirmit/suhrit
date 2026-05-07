import type { Patient } from '../../types/domain';

interface PatientCardProps {
  patient: Patient;
  onEdit: () => void;
  onOpenOpd: () => void;
  onOpenKarma: () => void;
  onPrintLastVisit: () => void;
  disabled?: boolean;
}

export function PatientCard({
  patient,
  onEdit,
  onOpenOpd,
  onOpenKarma,
  onPrintLastVisit,
  disabled,
}: PatientCardProps) {
  return (
    <article className="patient-card">
      <div className="patient-card__body">
        <h3 className="patient-card__title">
          {patient.firstName} {patient.lastName}
        </h3>
        <p className="muted">
          Patient ID: {patient.patientId} | Age: {patient.age}
        </p>
        <p className="muted">{patient.mobile}</p>
        <p className="muted patient-card__address">{patient.address}</p>
      </div>
      <div className="patient-card__actions">
        <button className="button button--primary" onClick={onOpenOpd} disabled={disabled}>
          OPD Continue
        </button>
        <button className="button button--secondary" onClick={onOpenKarma} disabled={disabled}>
          Karma Visit
        </button>
        <button className="button button--ghost" onClick={onPrintLastVisit} disabled={disabled}>
          Print Last Visit
        </button>
        <button className="button button--ghost" onClick={onEdit} disabled={disabled}>
          Edit
        </button>
      </div>
    </article>
  );
}
