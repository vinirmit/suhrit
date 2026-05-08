import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Constants from '../constants/legacy-constants';
import { useNotification } from '../hooks/useNotification';
import { fetchPatientHistory } from '../services/patients';
import { fetchMedicineList, fetchTagOptions, mergeTagOptions, updateCachedTags } from '../services/utils';
import { updateVisit } from '../services/visits';
import { formatDisplayDateTime } from '../utils/date';
import { removeEmptyObjectValues } from '../utils/forms';
import type {
  KarmaVisit,
  Medicine,
  PatientHistoryPayload,
  QueueVisit,
  Visit,
  VisitProfile,
} from '../types/domain';

const steps = ['History', 'Profile', 'Aasan-Karma', 'Diet', 'Medicines', 'Summary'] as const;
const AUTOCOMPLETE_LIMIT = 50;

function getAutocompleteOptions(options: string[], query: string): string[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return options.slice(0, AUTOCOMPLETE_LIMIT);
  }

  return options
    .filter((option) => option.toLocaleLowerCase().includes(normalizedQuery))
    .slice(0, AUTOCOMPLETE_LIMIT);
}

interface AutocompleteInputProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

function AutocompleteInput({
  label,
  value,
  options,
  onChange,
  onKeyDown,
}: AutocompleteInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const visibleOptions = useMemo(
    () => getAutocompleteOptions(options, value).filter((option) => option !== value),
    [options, value],
  );

  return (
    <label className="field field--floating autocomplete-field">
      <input
        className="field__control"
        value={value}
        placeholder=" "
        onBlur={() => {
          window.setTimeout(() => setIsFocused(false), 100);
        }}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={onKeyDown}
      />
      <span className="field__label">{label}</span>
      {isFocused && visibleOptions.length > 0 ? (
        <div className="autocomplete-panel" role="listbox">
          {visibleOptions.map((option) => (
            <button
              key={option}
              className="autocomplete-option"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option);
                setIsFocused(false);
              }}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}

function createEmptyVisitProfile(): VisitProfile {
  const examKeys = Object.keys(Constants.exams as Record<string, string[]>);
  return {
    reason: '',
    curMedcine: '',
    diagnosis: '',
    exams: examKeys.reduce<Record<string, string>>((accumulator, key) => {
      accumulator[key] = '';
      return accumulator;
    }, {}),
    readings: {},
    history: [],
    tags: [],
    notes: '',
  };
}

function createDefaultVisit(): Visit {
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
    visitDate: '',
    lastVisitDate: '',
    opdPayment: 0,
    profile: createEmptyVisitProfile(),
    medicines: [],
    pathya: [],
    apathya: [],
    karms: [],
    aasans: [],
  };
}

function normalizeVisit(state: QueueVisit | Visit | null): Visit {
  if (!state) {
    return createDefaultVisit();
  }

  if ('profile' in state && state.profile) {
    return {
      ...createDefaultVisit(),
      ...state,
      profile: {
        ...createEmptyVisitProfile(),
        ...state.profile,
        exams: {
          ...createEmptyVisitProfile().exams,
          ...state.profile.exams,
        },
      },
      medicines: state.medicines ?? [],
      pathya: state.pathya ?? [],
      apathya: state.apathya ?? [],
      karms: Array.isArray(state.karms) ? state.karms : [],
      aasans: state.aasans ?? [],
    };
  }

  return {
    ...createDefaultVisit(),
    patient: state.patient,
    type: state.type,
    visitId: state.visitId,
    visitDate: state.visitDate,
    lastVisitDate: state.lastVisitDate ?? '',
    opdPayment: state.opdPayment ?? 0,
  };
}

export default function OpdPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotification();
  const [activeStep, setActiveStep] = useState(0);
  const [visit, setVisit] = useState<Visit>(() =>
    normalizeVisit((location.state as QueueVisit | Visit | null) ?? null),
  );
  const [medicineOptions, setMedicineOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<Record<string, string[]>>({ tags: [] });
  const [patientHistory, setPatientHistory] = useState<PatientHistoryPayload | null>(null);
  const [historyTab, setHistoryTab] = useState<'progress' | 'opd' | 'karma'>('progress');
  const [selectedOpdHistoryIndex, setSelectedOpdHistoryIndex] = useState(0);
  const [draftTag, setDraftTag] = useState('');
  const [editingMedicineIndex, setEditingMedicineIndex] = useState<number | null>(null);
  const [draftMedicine, setDraftMedicine] = useState<Medicine>({
    name: '',
    days: 7,
    frequency: Constants.frequency[1],
    meal: Constants.meal[0],
    otherIns: Constants.otherIns[Constants.frequency[1] as keyof typeof Constants.otherIns],
  });

  useEffect(() => {
    const load = async () => {
      const [medicinesResult, tagsResult, historyResult] = await Promise.allSettled([
        fetchMedicineList(),
        fetchTagOptions(),
        visit.patient.patientId ? fetchPatientHistory(visit.patient.patientId) : Promise.resolve(null),
      ]);

      if (medicinesResult.status === 'fulfilled') {
        setMedicineOptions(medicinesResult.value);
      } else {
        setMedicineOptions([]);
      }

      if (tagsResult.status === 'fulfilled') {
        setTagOptions(tagsResult.value);
      } else {
        setTagOptions({ tags: [] });
      }

      if (historyResult.status === 'fulfilled') {
        setPatientHistory(historyResult.value);
      } else {
        setPatientHistory(null);
      }
    };

    void load();
  }, [notify, visit.patient.patientId]);

  const persistVisit = async (type: string, shouldNavigateToQueue: boolean) => {
    try {
      const filteredMedicines = visit.medicines.filter((medicine) => medicine.name.trim());
      const response = await updateVisit({
        ...visit,
        medicines: filteredMedicines,
        type,
        profile: {
          ...visit.profile,
          exams: removeEmptyObjectValues(visit.profile.exams) as typeof visit.profile.exams,
        },
      });

      if (response.success === false) {
        notify(response.message ?? 'Unable to save visit', 'error');
        return false;
      }

      if (shouldNavigateToQueue) {
        navigate('/queue');
      }

      return true;
    } catch {
      notify('Unable to save visit', 'error');
      return false;
    }
  };

  const addMedicine = () => {
    if (!draftMedicine.name.trim()) {
      notify('Medicine name is required', 'error');
      return;
    }

    if (
      visit.medicines.some(
        (item, index) => item.name === draftMedicine.name && index !== editingMedicineIndex,
      )
    ) {
      notify('Medicine already in the prescription', 'error');
      return;
    }

    setVisit((current) => {
      if (editingMedicineIndex === null) {
        return {
          ...current,
          medicines: [...current.medicines, draftMedicine],
        };
      }

      return {
        ...current,
        medicines: current.medicines.map((medicine, index) =>
          index === editingMedicineIndex ? draftMedicine : medicine,
        ),
      };
    });

    setEditingMedicineIndex(null);
    setDraftMedicine({
      name: '',
      days: 7,
      frequency: Constants.frequency[1],
      meal: Constants.meal[0],
      otherIns: Constants.otherIns[Constants.frequency[1] as keyof typeof Constants.otherIns],
    });
  };

  const startEditingMedicine = (index: number) => {
    setEditingMedicineIndex(index);
    setDraftMedicine(visit.medicines[index]);
  };

  const resetMedicineDraft = () => {
    setEditingMedicineIndex(null);
    setDraftMedicine({
      name: '',
      days: 7,
      frequency: Constants.frequency[1],
      meal: Constants.meal[0],
      otherIns: Constants.otherIns[Constants.frequency[1] as keyof typeof Constants.otherIns],
    });
  };

  const tagSet = useMemo(() => new Set(visit.profile.tags), [visit.profile.tags]);
  const historySet = useMemo(() => new Set(visit.profile.history), [visit.profile.history]);
  const patientSpecificTags = useMemo(() => {
    const historyTags =
      patientHistory?.visits.flatMap((item) => item.profile.tags ?? []) ?? [];
    return Array.from(new Set([...historyTags, ...visit.profile.tags])).filter(Boolean);
  }, [patientHistory?.visits, visit.profile.tags]);
  const suggestedTagOptions = useMemo(
    () =>
      Array.from(
        new Set([...(tagOptions.tags ?? []), ...patientSpecificTags, ...visit.profile.tags]),
      ).filter(Boolean),
    [patientSpecificTags, tagOptions.tags, visit.profile.tags],
  );
  const toggleVisitTag = (tag: string) => {
    const normalized = tag.trim();

    if (!normalized) {
      return;
    }

    setVisit((current) => ({
      ...current,
      profile: {
        ...current.profile,
        tags: current.profile.tags.includes(normalized)
          ? current.profile.tags.filter((value) => value !== normalized)
          : [...current.profile.tags, normalized],
      },
    }));
  };

  const addPatientSpecificTag = () => {
    const normalized = draftTag.trim();

    if (!normalized) {
      notify('Tag cannot be blank', 'error');
      return;
    }

    if (visit.profile.tags.includes(normalized)) {
      setDraftTag('');
      return;
    }

    setVisit((current) => ({
      ...current,
      profile: {
        ...current.profile,
        tags: [...current.profile.tags, normalized],
      },
    }));

    if (!(tagOptions.tags ?? []).includes(normalized)) {
      setTagOptions((current) => mergeTagOptions(current, { tags: [normalized] }));
      updateCachedTags([normalized]);
    }

    setDraftTag('');
  };

  return (
    <>
      <section className="section-header">
        <div>
          <h2 className="section-title">
            {visit.patient.patientId} - {visit.patient.firstName} {visit.patient.lastName}
          </h2>
          <p className="muted">
            {visit.patient.address} | {visit.patient.age} years old
          </p>
        </div>
        <div className="actions">
          <button
            className="button button--ghost"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((step) => step - 1)}
            type="button"
          >
            Back
          </button>
          <button
            className="button button--primary"
            onClick={async () => {
              if (activeStep === steps.length - 1) {
                await persistVisit('print', true);
                return;
              }

              const saved = await persistVisit('visit', false);
              if (saved) {
                setActiveStep((step) => step + 1);
              }
            }}
            type="button"
          >
            {activeStep === steps.length - 1 ? 'Prescribe' : 'Next'}
          </button>
        </div>
      </section>

      <div className="opd-steps">
        {steps.map((step, index) => (
          <button
            key={step}
            className={activeStep === index ? 'opd-step opd-step--active' : 'opd-step'}
            onClick={() => setActiveStep(index)}
            type="button"
          >
            {step}
          </button>
        ))}
      </div>

      {activeStep === 0 ? (
        <section className="card pad-1">
          <h3>Medical History</h3>
          <div className="tag-list">
            {(Constants.history as string[]).map((item) => (
              <button
                key={item}
                className={historySet.has(item) ? 'tag tag--active' : 'tag'}
                onClick={() =>
                  setVisit((current) => ({
                    ...current,
                    profile: {
                      ...current.profile,
                      history: historySet.has(item)
                        ? current.profile.history.filter((value) => value !== item)
                        : [...current.profile.history, item],
                    },
                  }))
                }
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="history-tabs mt-1">
            <button
              className={historyTab === 'progress' ? 'tab tab--active' : 'tab'}
              onClick={() => setHistoryTab('progress')}
              type="button"
            >
              Progress Report
            </button>
            <button
              className={historyTab === 'opd' ? 'tab tab--active' : 'tab'}
              onClick={() => setHistoryTab('opd')}
              type="button"
            >
              OPD History
            </button>
            <button
              className={historyTab === 'karma' ? 'tab tab--active' : 'tab'}
              onClick={() => setHistoryTab('karma')}
              type="button"
            >
              Karma History
            </button>
          </div>

          {historyTab === 'progress' ? (
            <PatientProgressTable visits={patientHistory?.visits ?? []} />
          ) : null}

          {historyTab === 'opd' ? (
            <OpdHistoryPanel
              visits={patientHistory?.visits ?? []}
              selectedIndex={selectedOpdHistoryIndex}
              onSelectIndex={setSelectedOpdHistoryIndex}
            />
          ) : null}

          {historyTab === 'karma' ? (
            <KarmaHistoryTable visits={patientHistory?.kvisits ?? []} />
          ) : null}
        </section>
      ) : null}

      {activeStep === 1 ? (
        <section className="card pad-1">
          <div className="grid grid--2">
            <label className="field field--floating">
              <input
                className="field__control"
                value={visit.profile.reason}
                placeholder=" "
                onChange={(event) =>
                  setVisit((current) => ({
                    ...current,
                    profile: { ...current.profile, reason: event.target.value },
                  }))
                }
              />
              <span className="field__label">Visit Reason</span>
            </label>
            <label className="field field--floating">
              <input
                className="field__control"
                value={visit.profile.curMedcine}
                placeholder=" "
                onChange={(event) =>
                  setVisit((current) => ({
                    ...current,
                    profile: { ...current.profile, curMedcine: event.target.value },
                  }))
                }
              />
              <span className="field__label">Current Medicine</span>
            </label>
            <label className="field field--floating">
              <input
                className="field__control"
                value={visit.profile.diagnosis}
                placeholder=" "
                onChange={(event) =>
                  setVisit((current) => ({
                    ...current,
                    profile: { ...current.profile, diagnosis: event.target.value },
                  }))
                }
              />
              <span className="field__label">Diagnosis</span>
            </label>
            <div className="field">
              <span className="field__label">Last Visit</span>
              <div className="surface pad-surface-sm">
                <p className="muted">{formatDisplayDateTime(visit.lastVisitDate)}</p>
              </div>
            </div>
          </div>

          <div className="profile-layout mt-1">
            <div className="profile-layout__main">
              <h3>Examination</h3>
              <div className="grid grid--3">
                {Object.entries(Constants.exams as Record<string, string[]>).map(([key, options]) => (
                  <label className="field field--floating field--floating-select" key={key}>
                    <select
                      className="field__control"
                      value={visit.profile.exams[key] ?? ''}
                      onChange={(event) =>
                        setVisit((current) => ({
                          ...current,
                          profile: {
                            ...current.profile,
                            exams: { ...current.profile.exams, [key]: event.target.value },
                          },
                        }))
                      }
                    >
                      <option value="">Select</option>
                      {options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <span className="field__label">{key}</span>
                  </label>
                ))}
              </div>

              <h3>Tags</h3>
              <div className="tag-list">
                {patientSpecificTags.map((tag) => (
                  <button
                    key={tag}
                    className={tagSet.has(tag) ? 'tag tag--active' : 'tag'}
                    onClick={() => toggleVisitTag(tag)}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="history-tag-entry mt-1">
                <AutocompleteInput
                  label="Add patient tag"
                  options={suggestedTagOptions}
                  value={draftTag}
                  onChange={setDraftTag}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addPatientSpecificTag();
                    }
                  }}
                />
                <button className="button button--ghost" onClick={addPatientSpecificTag} type="button">
                  Add Tag
                </button>
              </div>
            </div>

            <div className="profile-layout__side">
              <h3>Readings</h3>
              <div className="profile-readings-panel">
                <div className="grid">
                  {(Constants.readings as string[]).map((reading) => (
                    <AutocompleteInput
                      key={reading}
                      label={reading}
                      options={tagOptions[reading] ?? []}
                      value={visit.profile.readings[reading] ?? ''}
                      onChange={(value) =>
                        setVisit((current) => ({
                          ...current,
                          profile: {
                            ...current.profile,
                            readings: {
                              ...current.profile.readings,
                              [reading]: value,
                            },
                          },
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <label className="field field--floating mt-1">
            <textarea
              className="field__control field__control--textarea"
              value={visit.profile.notes}
              placeholder=" "
              onChange={(event) =>
                setVisit((current) => ({
                  ...current,
                  profile: { ...current.profile, notes: event.target.value },
                }))
              }
            />
            <span className="field__label">Additional Notes</span>
          </label>
        </section>
      ) : null}

      {activeStep === 2 ? (
        <section className="card pad-1">
          <h3>Aasan</h3>
          <div className="tag-list">
            {(Constants.aasans as string[]).map((item) => (
              <button
                key={item}
                className={visit.aasans.includes(item) ? 'tag tag--active' : 'tag'}
                onClick={() =>
                  setVisit((current) => ({
                    ...current,
                    aasans: current.aasans.includes(item)
                      ? current.aasans.filter((value) => value !== item)
                      : [...current.aasans, item],
                  }))
                }
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <h3>Karma</h3>
          <div className="tag-list">
            {(Constants.karms as string[]).map((item) => (
              <button
                key={item}
                className={visit.karms.includes(item) ? 'tag tag--active' : 'tag'}
                onClick={() =>
                  setVisit((current) => ({
                    ...current,
                    karms: current.karms.includes(item)
                      ? current.karms.filter((value) => value !== item)
                      : [...current.karms, item],
                  }))
                }
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {activeStep === 3 ? (
        <section className="card pad-1">
          {Object.entries(Constants.diets as Record<string, string[]>).map(([group, items]) => (
            <div key={group} className="mb-1">
              <h3>{group}</h3>
              <div className="tag-list">
                {items.map((item) => {
                  const isPathya = visit.pathya.includes(item);
                  const isApathya = visit.apathya.includes(item);

                  return (
                    <button
                      key={item}
                      className={
                        isPathya
                          ? 'tag tag--pathya'
                          : isApathya
                            ? 'tag tag--apathya'
                            : 'tag'
                      }
                      onClick={() =>
                        setVisit((current) => {
                          if (current.pathya.includes(item)) {
                            return {
                              ...current,
                              pathya: current.pathya.filter((value) => value !== item),
                              apathya: [...current.apathya, item],
                            };
                          }

                          if (current.apathya.includes(item)) {
                            return {
                              ...current,
                              apathya: current.apathya.filter((value) => value !== item),
                            };
                          }

                          return { ...current, pathya: [...current.pathya, item] };
                        })
                      }
                      type="button"
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {activeStep === 4 ? (
        <section className="card pad-1">
          <div className="medicine-layout">
            <div className="medicine-layout__list">
              <h3>Prescribed Medicines</h3>
              {visit.medicines.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Days</th>
                        <th>Frequency</th>
                        <th>Meal</th>
                        <th>Other Instructions</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visit.medicines.map((medicine, index) => (
                        <tr key={`${medicine.name}-${index}`}>
                          <td>{medicine.name}</td>
                          <td>{medicine.days}</td>
                          <td>{medicine.frequency}</td>
                          <td>{medicine.meal}</td>
                          <td>{medicine.otherIns}</td>
                          <td>
                            <div className="medicine-actions">
                              <button
                                className="button button--ghost"
                                onClick={() => startEditingMedicine(index)}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                className="button button--ghost"
                                onClick={() =>
                                  setVisit((current) => ({
                                    ...current,
                                    medicines: current.medicines.filter(
                                      (_, position) => position !== index,
                                    ),
                                  }))
                                }
                                type="button"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No medicines added yet.</p>
              )}
            </div>

            <div className="medicine-layout__editor surface pad-1">
              <h3>{editingMedicineIndex === null ? 'New Medicine' : 'Edit Medicine'}</h3>
              <div className="grid">
                <label className="field field--floating">
                  <input
                    className="field__control"
                    list="medicine-options"
                    value={draftMedicine.name}
                    placeholder=" "
                    onChange={(event) =>
                      setDraftMedicine((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                  <span className="field__label">Medicine</span>
                  <datalist id="medicine-options">
                    {medicineOptions.map((medicine) => (
                      <option key={medicine} value={medicine} />
                    ))}
                  </datalist>
                </label>
                <label className="field field--floating">
                  <input
                    className="field__control"
                    type="number"
                    min="1"
                    value={draftMedicine.days}
                    placeholder=" "
                    onChange={(event) =>
                      setDraftMedicine((current) => ({
                        ...current,
                        days: Number(event.target.value) || 0,
                      }))
                    }
                  />
                  <span className="field__label">Days</span>
                </label>
                <label className="field field--floating field--floating-select">
                  <select
                    className="field__control"
                    value={draftMedicine.frequency}
                    onChange={(event) =>
                      setDraftMedicine((current) => ({
                        ...current,
                        frequency: event.target.value,
                        otherIns:
                          Constants.otherIns[
                            event.target.value as keyof typeof Constants.otherIns
                          ] ?? current.otherIns,
                      }))
                    }
                  >
                    {(Constants.frequency as string[]).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span className="field__label">Frequency</span>
                </label>
                <label className="field field--floating field--floating-select">
                  <select
                    className="field__control"
                    value={draftMedicine.meal}
                    onChange={(event) =>
                      setDraftMedicine((current) => ({ ...current, meal: event.target.value }))
                    }
                  >
                    {(Constants.meal as string[]).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span className="field__label">Meal</span>
                </label>
                <label className="field field--floating">
                  <input
                    className="field__control"
                    value={draftMedicine.otherIns}
                    placeholder=" "
                    onChange={(event) =>
                      setDraftMedicine((current) => ({ ...current, otherIns: event.target.value }))
                    }
                  />
                  <span className="field__label">Other Instructions</span>
                </label>
              </div>

              <div className="actions mt-1">
                <button className="button button--primary" onClick={addMedicine} type="button">
                  {editingMedicineIndex === null ? 'Add Medicine' : 'Save Medicine'}
                </button>
                {editingMedicineIndex !== null ? (
                  <button className="button button--ghost" onClick={resetMedicineDraft} type="button">
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeStep === 5 ? (
        <section className="card pad-1">
          <div className="grid grid--2">
            <div className="surface pad-1">
              <h3>Aasan</h3>
              <div className="tag-list">
                {visit.aasans.length > 0 ? (
                  visit.aasans.map((item) => <span key={item} className="tag">{item}</span>)
                ) : (
                  <p className="muted">No Aasans prescribed</p>
                )}
              </div>
            </div>
            <div className="surface pad-1">
              <h3>Karms</h3>
              <div className="tag-list">
                {visit.karms.length > 0 ? (
                  visit.karms.map((item) => <span key={item} className="tag">{item}</span>)
                ) : (
                  <p className="muted">No Karms prescribed</p>
                )}
              </div>
            </div>
            <div className="surface pad-1">
              <h3>Pathya</h3>
              <div className="tag-list">
                {visit.pathya.length > 0 ? (
                  visit.pathya.map((item) => <span key={item} className="tag">{item}</span>)
                ) : (
                  <p className="muted">No Diet prescribed</p>
                )}
              </div>
            </div>
            <div className="surface pad-1">
              <h3>Apathya</h3>
              <div className="tag-list">
                {visit.apathya.length > 0 ? (
                  visit.apathya.map((item) => <span key={item} className="tag">{item}</span>)
                ) : (
                  <p className="muted">No Diet prescribed</p>
                )}
              </div>
            </div>
          </div>
          <div className="table-wrap mt-1">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Days</th>
                  <th>Frequency</th>
                  <th>Meal</th>
                  <th>Other Instructions</th>
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
        </section>
      ) : null}
    </>
  );
}

function getMedicineNames(medicines: Medicine[] = []): string {
  return medicines.length > 0 ? medicines.map((item) => item.name).join(', ') : 'No Medicines';
}

function getTagNames(tags: string[] = []): string {
  return tags.length > 0 ? tags.join(', ') : 'No Tags';
}

function PatientProgressTable({ visits }: { visits: Visit[] }) {
  if (visits.length === 0) {
    return <p className="muted mt-1">No Visit History</p>;
  }

  return (
    <div className="table-wrap mt-1">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Weight</th>
            <th>Tags</th>
            <th>चयापचय स्थिति</th>
            <th>दाईं नाड़ी</th>
            <th>बाईं नाड़ी</th>
            <th>नाभिस्थिति</th>
            <th>उपद्रव</th>
            <th>प्रयोगशाला संबंधी</th>
            <th>रक्तचाप</th>
            <th>Medicines</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((item, index) => (
            <tr key={`${item.visitId}-${index}`}>
              <td>{formatDisplayDateTime(item.visitDate)}</td>
              <td>{item.profile.readings.Weight ?? '-'}</td>
              <td>{getTagNames(item.profile.tags)}</td>
              <td>{item.profile.exams['चयापचय स्थिति'] ?? '-'}</td>
              <td>{item.profile.exams['दाईं नाड़ी'] ?? '-'}</td>
              <td>{item.profile.exams['बाईं नाड़ी'] ?? '-'}</td>
              <td>{item.profile.exams['नाभिस्थिति'] ?? '-'}</td>
              <td>{item.profile.readings['उपद्रव'] ?? '-'}</td>
              <td>{item.profile.readings['प्रयोगशाला संबंधी'] ?? '-'}</td>
              <td>{item.profile.readings['रक्तचाप'] ?? '-'}</td>
              <td>{getMedicineNames(item.medicines)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpdHistoryPanel({
  visits,
  selectedIndex,
  onSelectIndex,
}: {
  visits: Visit[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}) {
  if (visits.length === 0) {
    return <p className="muted mt-1">No Visit History</p>;
  }

  const selectedVisit = visits[Math.min(selectedIndex, visits.length - 1)];
  const readingKeys = Constants.readings as string[];
  const historyKeys = Constants.history as string[];

  return (
    <div className="history-panel mt-1">
      <div className="history-panel__list">
        {visits.map((item, index) => (
          <button
            key={`${item.visitId}-${index}`}
            className={selectedIndex === index ? 'history-panel__item history-panel__item--active' : 'history-panel__item'}
            onClick={() => onSelectIndex(index)}
            type="button"
          >
            {formatDisplayDateTime(item.visitDate)}
          </button>
        ))}
      </div>
      <div className="history-panel__content">
        <div className="surface pad-1">
          <h4 className="history-panel__title">Clinical Snapshot</h4>
          <div className="history-summary-grid">
            {readingKeys.map((key) => (
              <div key={key} className="history-summary-grid__item">
                <span className="history-summary-grid__label">{key}</span>
                <strong>{selectedVisit.profile.readings[key] || '-'}</strong>
              </div>
            ))}
          </div>
          <div className="tag-list mt-1">
            {historyKeys.map((item) => (
              <span
                key={item}
                className={selectedVisit.profile.history.includes(item) ? 'tag tag--active' : 'tag'}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="table-wrap mt-1">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Days</th>
                <th>Frequency</th>
                <th>Meal</th>
                <th>Other Instructions</th>
              </tr>
            </thead>
            <tbody>
              {selectedVisit.medicines.length > 0 ? (
                selectedVisit.medicines.map((medicine, index) => (
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
      </div>
    </div>
  );
}

function KarmaHistoryTable({ visits }: { visits: KarmaVisit[] }) {
  if (visits.length === 0) {
    return <p className="muted mt-1">No Karma Visits</p>;
  }

  return (
    <div className="table-wrap mt-1">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Karm</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit, index) => (
            <tr key={`${visit.visitId}-${index}`}>
              <td>{formatDisplayDateTime(visit.visitDate)}</td>
              <td>
                <div className="tag-list">
                  {Object.keys(visit.karms).map((key) => (
                    <span key={key} className="tag">
                      {key}
                    </span>
                  ))}
                </div>
              </td>
              <td>{visit.payment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
