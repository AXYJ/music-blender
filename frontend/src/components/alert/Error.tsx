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
          className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 pl-6 pr-10 py-3 bg-red-600/90 text-white rounded-lg shadow-lg backdrop-blur-md flex items-center gap-3 w-[calc(100%-4rem)] justify-center max-w-[704px]"
        >
          <span className="font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-white transition-colors cursor-pointer absolute top-1/2 right-4 -translate-y-1/2"
            aria-label="Fermer"
          >
            <svg
              className="w-4 h-4"
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
