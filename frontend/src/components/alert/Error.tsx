"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function Error({
  error,
  setError,
}: {
  error: string | null;
  setError: (error: string | null) => void;
}) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="fixed top-8 left-1/2 z-50 flex w-[calc(100vw-4rem)] max-w-md -translate-x-1/2 transform items-center justify-center gap-3 rounded-lg bg-red-600/90 py-3 pr-10 pl-6 text-white shadow-lg backdrop-blur-md md:w-full"
        >
          <span className="font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="absolute top-1/2 right-4 ml-2 -translate-y-1/2 cursor-pointer text-white transition-colors"
            aria-label="Fermer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
