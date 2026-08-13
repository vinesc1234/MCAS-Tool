import { useState } from 'react';
import { formatDuration } from '../lib/format';

interface MinutesPickerProps {
  value?: number;
  presets: number[];
  onChange: (value: number | undefined) => void;
}

/** Preset buttons cover the common cases in one tap; custom handles the rest. */
export default function MinutesPicker({ value, presets, onChange }: MinutesPickerProps) {
  const [custom, setCustom] = useState(value != null && !presets.includes(value));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setCustom(false);
              onChange(value === p ? undefined : p);
            }}
            className={`chip ${
              value === p && !custom
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-700 ring-1 ring-brand-200'
            }`}
          >
            {formatDuration(p)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setCustom(!custom);
            if (custom) onChange(undefined);
          }}
          className={`chip ${
            custom ? 'bg-brand-600 text-white' : 'bg-white text-gray-700 ring-1 ring-brand-200'
          }`}
        >
          Custom
        </button>
      </div>

      {custom && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={value ?? ''}
            placeholder="0"
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            className="text-input w-32"
          />
          <span className="text-sm text-gray-500">minutes</span>
        </div>
      )}
    </div>
  );
}
