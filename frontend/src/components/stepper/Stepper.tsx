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
          className={`aspect-square rounded-full bg-(--white) p-1 text-(--background) transition-all duration-100 ease-out hover:scale-105 active:scale-95 ${
            minDisabled ? "cursor-not-allowed opacity-50" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (!minDisabled) onDecrement();
          }}
          disabled={minDisabled}
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-minus-icon lucide-minus"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
      )}
      <p>{value}</p>
      {!readOnly && onIncrement && (
        <button
          className={`aspect-square rounded-full bg-(--white) p-1 text-(--background) transition-all duration-100 ease-out hover:scale-105 active:scale-95 ${
            maxDisabled ? "cursor-not-allowed opacity-50" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (!maxDisabled) onIncrement();
          }}
          disabled={maxDisabled}
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-plus-icon lucide-plus"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
        </button>
      )}
    </div>
  );
}
