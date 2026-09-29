import * as React from "react"
import { cn } from "cn"

interface SliderProps {
  value?: number[]
  defaultValue?: number[]
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number[]) => void
  className?: string
  disabled?: boolean
}

export const Slider: React.FC<SliderProps> = ({
  value,
  defaultValue = [0],
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  className,
  disabled = false,
}) => {
  const [internalValue, setInternalValue] = React.useState<number[]>(value || defaultValue);

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const currentVal = internalValue[0] ?? min;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = [Number(e.target.value)];
    setInternalValue(newVal);
    onValueChange?.(newVal);
  };

  const percentage = Math.min(100, Math.max(0, ((currentVal - min) / (max - min)) * 100));

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
      <div className="relative h-2 w-full grow overflow-hidden bg-secondary border border-border">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentVal}
        disabled={disabled}
        onChange={handleChange}
        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={currentVal}
        tabIndex={disabled ? -1 : 0}
        style={{ left: `calc(${percentage}% - 8px)` }}
        className="pointer-events-none absolute block h-4 w-4 border-2 border-primary bg-background shadow transition-colors"
      />
    </div>
  );
};
