import React from 'react';

interface UrgeSliderProps {
  value: number; // 1 to 10
  onChange: (val: number) => void;
  disabled?: boolean;
}

export const UrgeSlider: React.FC<UrgeSliderProps> = ({ value, onChange, disabled }) => {
  const getIntensityLabel = (val: number) => {
    if (val <= 3) return { text: 'Mild Impulse', color: 'text-gold-400', bg: 'bg-gold-500/10 border-gold-500/30' };
    if (val <= 6) return { text: 'Moderate Friction', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
    if (val <= 8) return { text: 'Intense Wave', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
    return { text: 'Acute Storm', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };
  };

  const currentLabel = getIntensityLabel(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="urge-intensity-slider" className="text-xs font-medium text-slate-300">
          Urge Intensity (1–10)
        </label>
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${currentLabel.bg} ${currentLabel.color}`}
          >
            {currentLabel.text}
          </span>
          <span className="font-mono text-sm font-bold text-slate-100 bg-obsidian-800 border border-obsidian-700 px-2 py-0.5 rounded">
            {value} / 10
          </span>
        </div>
      </div>

      <div className="relative flex items-center select-none">
        <input
          id="urge-intensity-slider"
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-obsidian-800 rounded-lg appearance-none cursor-pointer accent-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/40 disabled:opacity-50"
          aria-label="Urge intensity scale from 1 to 10"
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 font-mono px-0.5">
        <span>1: Subtle</span>
        <span>5: Noticeable</span>
        <span>10: Extreme</span>
      </div>
    </div>
  );
};
