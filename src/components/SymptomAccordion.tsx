import { useState } from 'react';
import type { BodySystem, Symptom, SymptomEntry } from '../types';
import { severityLabel } from '../lib/format';

interface SymptomAccordionProps {
  systems: BodySystem[];
  symptoms: Symptom[];
  value: SymptomEntry[];
  onChange: (value: SymptomEntry[]) => void;
}

const DEFAULT_SEVERITY = 5;

/**
 * "Did this trigger your stomach? If so, which symptoms?" — one collapsible section
 * per body system, so the screen stays short and you only open what's relevant.
 */
export default function SymptomAccordion({
  systems,
  symptoms,
  value,
  onChange,
}: SymptomAccordionProps) {
  const [open, setOpen] = useState<string | null>(null);

  const selected = new Map(value.map((s) => [s.symptomId, s.severity]));

  function toggleSymptom(symptomId: string) {
    if (selected.has(symptomId)) {
      onChange(value.filter((s) => s.symptomId !== symptomId));
    } else {
      onChange([...value, { symptomId, severity: DEFAULT_SEVERITY }]);
    }
  }

  function setSeverity(symptomId: string, severity: number) {
    onChange(value.map((s) => (s.symptomId === symptomId ? { ...s, severity } : s)));
  }

  return (
    <div className="space-y-2">
      {systems
        .filter((sys) => !sys.archived)
        .map((sys) => {
          const sysSymptoms = symptoms.filter((s) => s.systemId === sys.id && !s.archived);
          if (sysSymptoms.length === 0) return null;
          const count = sysSymptoms.filter((s) => selected.has(s.id)).length;
          const isOpen = open === sys.id;

          return (
            <div
              key={sys.id}
              className={`overflow-hidden rounded-xl ring-1 transition ${
                count > 0 ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-brand-100'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : sys.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <span className="font-semibold text-brand-900">{sys.label}</span>
                <span className="flex items-center gap-2">
                  {count > 0 && (
                    <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">
                      {count}
                    </span>
                  )}
                  <span
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="space-y-1 border-t border-brand-100 px-3 pt-2 pb-3">
                  {sysSymptoms.map((symptom) => {
                    const severity = selected.get(symptom.id);
                    const isChecked = severity !== undefined;
                    return (
                      <div key={symptom.id}>
                        <button
                          type="button"
                          onClick={() => toggleSymptom(symptom.id)}
                          aria-pressed={isChecked}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition active:bg-brand-100"
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm text-white transition ${
                              isChecked ? 'bg-brand-600' : 'bg-white ring-1 ring-brand-300'
                            }`}
                            aria-hidden="true"
                          >
                            {isChecked ? '✓' : ''}
                          </span>
                          <span
                            className={isChecked ? 'font-medium text-brand-900' : 'text-gray-700'}
                          >
                            {symptom.label}
                          </span>
                        </button>

                        {isChecked && (
                          <div className="mb-2 px-2 pb-1 pl-11">
                            <div className="mb-1 flex items-baseline justify-between">
                              <label
                                htmlFor={`sev-${symptom.id}`}
                                className="text-xs font-medium text-gray-500"
                              >
                                Severity
                              </label>
                              <span className="text-xs font-semibold text-brand-700">
                                {severity} · {severityLabel(severity)}
                              </span>
                            </div>
                            <input
                              id={`sev-${symptom.id}`}
                              type="range"
                              min={1}
                              max={10}
                              step={1}
                              value={severity}
                              onChange={(e) => setSeverity(symptom.id, Number(e.target.value))}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
