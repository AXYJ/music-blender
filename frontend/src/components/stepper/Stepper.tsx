import React from "react";

interface StepperProps {
  value: number | string;
  onIncrement?: () => void;
  onDecrement?: () => void;
  minDisabled?: boolean;
  maxDisabled?: boolean;
  readOnly?: boolean;
}

export default function Stepper({
  value,
  onIncrement,
  onDecrement,
  minDisabled = false,
  maxDisabled = false,
  readOnly = false,
}: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {!readOnly && onDecrement && (
        <button
          className={`aspect-square h-8 w-8 rounded-full bg-(--white) text-(--background) transition-all duration-100 ease-out hover:scale-105 active:scale-95 ${
            minDisabled ? "cursor-not-allowed opacity-50" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (!minDisabled) onDecrement();
          }}
          disabled={minDisabled}
          type="button"
        >
          -
        </button>
      )}
      <p>{value}</p>
      {!readOnly && onIncrement && (
        <button
          className={`aspect-square h-8 w-8 rounded-full bg-(--white) text-(--background) transition-all duration-100 ease-out hover:scale-105 active:scale-95 ${
            maxDisabled ? "cursor-not-allowed opacity-50" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (!maxDisabled) onIncrement();
          }}
          disabled={maxDisabled}
          type="button"
        >
          +
        </button>
      )}
    </div>
  );
}
