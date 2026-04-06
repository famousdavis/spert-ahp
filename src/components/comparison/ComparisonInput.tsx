import { SAATY_SCALE } from '../../core/models/constants';

interface ComparisonInputProps {
  itemA: string;
  itemB: string;
  value: number | undefined;
  onChange: (value: number) => void;
  mode?: 'importance' | 'preference';
  criterionLabel?: string;
}

export default function ComparisonInput({ itemA, itemB, value, onChange, mode = 'importance', criterionLabel }: ComparisonInputProps) {
  const storedToSlider = (stored: number | undefined): number => {
    if (stored === undefined || stored === null) return 0;
    if (stored >= 1) return Math.round(stored - 1);
    return -Math.round(1 / stored - 1);
  };

  const sliderToStored = (slider: number): number => {
    if (slider > 0) return slider + 1;
    if (slider < 0) return 1 / (Math.abs(slider) + 1);
    return 1;
  };

  const sliderValue = storedToSlider(value);
  const isSet = value !== undefined;

  const getLabel = (): string => {
    if (!isSet) return 'Not set';
    const absSlider = Math.abs(sliderValue);
    const entry = SAATY_SCALE.find((s) => s.value === absSlider + 1) ?? SAATY_SCALE[0]!;
    const label = mode === 'preference'
      ? entry.label.replace(/important/g, 'preferred')
      : entry.label;
    if (sliderValue > 0) return `${itemA} — ${label}`;
    if (sliderValue < 0) return `${itemB} — ${label}`;
    return label;
  };

  // Thumb position as percentage (0% = far left at -8, 50% = center at 0, 100% = far right at +8)
  const thumbPercent = ((sliderValue + 8) / 16) * 100;

  // Blue bar: fills from the left edge to the thumb when left item is favored (slider > 0)
  const blueWidth = sliderValue > 0 ? thumbPercent : 0;

  // Amber bar: fills from the right edge to the thumb when right item is favored (slider < 0)
  const amberWidth = sliderValue < 0 ? 100 - thumbPercent : 0;

  const thumbColor = sliderValue > 0 ? '#3b82f6' : sliderValue < 0 ? '#f59e0b' : '#9ca3af';

  return (
    <div className={`p-3 rounded-lg border ${isSet ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800' : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'}`}>
      <div className="flex justify-between text-sm mb-1">
        <span className={`truncate max-w-[40%] ${sliderValue > 0 ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-gray-500 dark:text-gray-400'}`}>{itemA}</span>
        <span className={`truncate max-w-[40%] text-right ${sliderValue < 0 ? 'font-bold text-amber-600 dark:text-amber-400' : 'font-medium text-gray-500 dark:text-gray-400'}`}>{itemB}</span>
      </div>
      <div className="relative py-2">
        {/* Blue fill — grows from left edge toward thumb when left item favored */}
        <div
          className="absolute top-1/2 left-0 h-1.5 rounded-full -translate-y-1/2 pointer-events-none"
          style={{
            width: `${blueWidth}%`,
            backgroundColor: '#3b82f6',
            transition: 'width 150ms ease-out',
          }}
        />
        {/* Amber fill — grows from right edge toward thumb when right item favored */}
        <div
          className="absolute top-1/2 right-0 h-1.5 rounded-full -translate-y-1/2 pointer-events-none"
          style={{
            width: `${amberWidth}%`,
            backgroundColor: '#f59e0b',
            transition: 'width 150ms ease-out',
          }}
        />
        <input
          type="range"
          min={-8}
          max={8}
          value={sliderValue}
          onChange={(e) => onChange(sliderToStored(Number(e.target.value)))}
          className="comparison-slider w-full relative z-10"
          style={{
            '--thumb-color': thumbColor,
          } as React.CSSProperties}
        />
        {/* Center tick */}
        <div
          className="absolute top-1/2 w-px h-3 -translate-y-1/2 bg-gray-400 dark:bg-gray-500 pointer-events-none"
          style={{ left: '50%' }}
        />
      </div>
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1">
        <span>{getLabel()}</span>
        {isSet && value !== 1 && (
          <span className="ml-2 text-gray-400 dark:text-gray-500">
            ({value >= 1 ? value.toFixed(0) : `1/${(1 / value).toFixed(0)}`})
          </span>
        )}
        {isSet && criterionLabel && (
          <span className="text-gray-400 dark:text-gray-500"> w.r.t. <span className="font-bold text-gray-600 dark:text-gray-300">{criterionLabel}</span></span>
        )}
      </div>
    </div>
  );
}
