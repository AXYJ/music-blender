import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/context/LanguageContext";

interface AutocompleteInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: any[];
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  timeLeft: number;
  showAnswer: boolean;
  isCorrect?: boolean;
  isHalfCorrect?: boolean;
  isMultiple?: boolean;
  placeholder?: string;
  getSuggestionValue: (item: any) => string;
  getSuggestionLabel: (item: any) => { main: string; secondary?: string };
  emptyText?: string;
  phase: string;
}

export default function AutocompleteInput({
  id,
  label,
  value,
  onChange,
  suggestions,
  isActive,
  onActivate,
  onDeactivate,
  timeLeft,
  showAnswer,
  isCorrect = false,
  isHalfCorrect = false,
  isMultiple = false,
  placeholder = "",
  getSuggestionValue,
  getSuggestionLabel,
  emptyText,
  phase,
}: AutocompleteInputProps) {
  const { t } = useTranslation();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const finalEmptyText = emptyText || t("autocomplete.no-results");

  const getQuery = (inputVal: string) => {
    if (isMultiple) {
      const parts = inputVal.split(",");
      return parts[parts.length - 1].trim();
    }
    return inputVal.trim();
  };

  const query = getQuery(value);

  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  useEffect(() => {
    if (!isActive) {
      setShowSuggestions(false);
    }
  }, [isActive]);

  const handleSelect = (item: any) => {
    const selectedText = getSuggestionValue(item);
    if (isMultiple) {
      const parts = value.split(",");
      parts[parts.length - 1] = " " + selectedText;
      const newValue =
        parts
          .map((p) => p.trim())
          .filter(Boolean)
          .join(", ") + ", ";
      onChange(newValue);
    } else {
      onChange(selectedText);
      onDeactivate();
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      setShowSuggestions(false);
      return;
    }

    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const indexToSelect =
          activeIndex >= 0 && activeIndex < suggestions.length
            ? activeIndex
            : 0;
        handleSelect(suggestions[indexToSelect]);
      } else if (e.key === "Escape") {
        onDeactivate();
        setShowSuggestions(false);
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    } else {
      if (e.key === "Enter" || e.key === "Escape") {
        onDeactivate();
        setShowSuggestions(false);
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    }
  };

  const handleFocus = () => {
    if (phase !== "guessing") return;
    onActivate();
    if (query.length > 2) {
      setShowSuggestions(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    const newQuery = getQuery(newVal);
    if (newQuery.length > 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  let bgClass = "bg-(--white) text-(--background)";
  if (showAnswer) {
    if (isCorrect) {
      bgClass = "bg-(--green) text-white";
    } else if (isHalfCorrect) {
      bgClass = "bg-amber-500 text-white";
    } else {
      bgClass = "bg-(--red) text-white";
    }
  }

  return (
    <>
      {isActive && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-all duration-300"
          onClick={() => {
            onDeactivate();
            setShowSuggestions(false);
          }}
        />
      )}

      <motion.div
        layout
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        className={`flex flex-col ${
          isActive
            ? "fixed top-[20%] left-1/2 z-50 w-80 max-w-[90vw] -translate-x-1/2"
            : "absolute inset-0"
        }`}
        onClick={() => {
          if (phase !== "guessing") return;
          onActivate();
          if (query.length > 2) {
            setShowSuggestions(true);
          }
        }}
      >
        <div className="flex w-full justify-between">
          <label htmlFor={id} className="mb-1 text-xl">
            {label}
          </label>
          {isActive && (
            <span className="text-xs text-(--grey) italic">
              {t("game.time-remaining")} : {timeLeft}s
            </span>
          )}
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder}
          className={`w-full rounded-lg px-4 py-2 focus:ring-2 focus:ring-(--accent) focus:outline-none ${bgClass}`}
          value={value}
          onFocus={handleFocus}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          disabled={showAnswer}
        />

        {showSuggestions && query.length > 2 && (
          <div className="absolute top-full right-0 left-0 z-50 mt-2 flex max-h-60 flex-col overflow-hidden overflow-y-auto rounded-xl border border-neutral-800/80 bg-neutral-900/95 shadow-2xl backdrop-blur-md">
            {suggestions.length > 0 ? (
              suggestions.map((item, idx) => {
                const displayLabel = getSuggestionLabel(item);
                const isItemActive = idx === activeIndex;
                return (
                  <div
                    key={displayLabel.main + "-" + idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item);
                    }}
                    className={`grid cursor-pointer grid-cols-3 items-center justify-between border-b border-neutral-800/50 px-4 py-3 text-sm transition-colors duration-150 last:border-0 ${
                      isItemActive
                        ? "bg-(--semiaccent) text-(--white)"
                        : "text-gray-200 hover:bg-(--semiaccent) hover:text-(--white)"
                    }`}
                  >
                    <span className="col-span-2 font-medium">
                      {displayLabel.main}
                    </span>
                    {displayLabel.secondary && (
                      <span className="wrap-break-words w-full text-right text-xs whitespace-normal text-gray-400 italic">
                        ({displayLabel.secondary})
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400 italic">
                {finalEmptyText}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}
