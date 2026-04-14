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
  // Slider direction: negative = drag left = prefer left item (itemA),
  //                    positive = drag right = prefer right item (itemB).
  const storedToSlider = (stored: number | undefined): number => {
    if (stored === undefined || stored === null) return 0;
    if (stored >= 1) return -Math.round(stored - 1);   // itemA preferred → left
    return Math.round(1 / stored - 1);                  // itemB preferred → right
  };

  const sliderToStored = (slider: number): number => {
    if (slider < 0) return Math.abs(slider) + 1;        // left drag → itemA (stored ≥ 1)
    if (slider > 0) return 1 / (slider + 1);            // right drag → itemB (stored < 1)
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
    if (sliderValue < 0) return `${itemA} — ${label}`;
    if (sliderValue > 0) return `${itemB} — ${label}`;
    return label;
  };

  const thumbColor = sliderValue < 0 ? '#3b82f6' : sliderValue > 0 ? '#f59e0b' : '#9ca3af';

  // 17 intensity bars, one per slider position (-8 to +8)
  // Bars fill outward from center toward the thumb direction
  const bars = Array.from({ length: 17 }, (_, i) => {
    const pos = i - 8; // -8..+8
    const height = 6 + (Math.abs(pos) / 8) * 22; // 6px at center, 28px at extremes
    const leftPercent = (i / 16) * 100;
    const isActive =
      (sliderValue < 0 && pos < 0 && pos >= sliderValue) ||
      (sliderValue > 0 && pos > 0 && pos <= sliderValue);
    let color: string;
    if (isActive && sliderValue < 0) color = '#3b82f6';
    else if (isActive && sliderValue > 0) color = '#f59e0b';
    else color = 'var(--bar-inactive)';
    return { pos, height, leftPercent, color };
  });

  return (
    <div className={`p-3 rounded-lg border ${isSet ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800' : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'}`}>
      <div className="flex justify-between text-sm mb-1 gap-4">
        <span className={`max-w-[45%] ${sliderValue < 0 ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-gray-500 dark:text-gray-400'}`}>{itemA}</span>
        <span className={`max-w-[45%] text-right ${sliderValue > 0 ? 'font-bold text-amber-600 dark:text-amber-400' : 'font-medium text-gray-500 dark:text-gray-400'}`}>{itemB}</span>
      </div>
      <div className="comparison-slider-wrap relative" style={{ height: '50px' }}>
        {/* Intensity bars — top portion */}
        <div className="absolute inset-x-0 top-0 flex justify-between items-end pointer-events-none" style={{ height: '30px' }}>
          {bars.map((bar) => (
            <div
              key={bar.pos}
              className="rounded-sm"
              style={{
                flex: '1 1 0',
                margin: '0 1px',
                height: `${bar.height}px`,
                backgroundColor: bar.color,
                transition: 'background-color 150ms ease-out',
              }}
            />
          ))}
        </div>
        {/* Slider thumb — below bars */}
        <input
          type="range"
          min={-8}
          max={8}
          value={sliderValue}
          onChange={(e) => onChange(sliderToStored(Number(e.target.value)))}
          className="comparison-slider w-full absolute left-0"
          style={{
            '--thumb-color': thumbColor,
            bottom: '4px',
          } as React.CSSProperties}
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
