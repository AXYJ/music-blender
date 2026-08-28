"use client";

import { useState } from "react";

export default function Toggle({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [isOn, setIsOn] = useState<boolean>(false);

  const handleToggle = () => {
    setIsOn(!isOn);
  };

  return (
    <div className="toggle-container">
      <button
        onClick={handleToggle}
        className="text-md flex w-full cursor-pointer justify-between border-b-2 border-(--grey) px-2 py-2 text-left transition-all duration-300 hover:bg-(--grey) hover:text-(--background)"
      >
        {question}
      </button>
      <div
        className={`grid px-2 transition-all duration-500 ${
          isOn ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mb-2 pt-4 text-sm">
            <div dangerouslySetInnerHTML={{ __html: answer }} />
          </div>
        </div>
      </div>
    </div>
  );
}
