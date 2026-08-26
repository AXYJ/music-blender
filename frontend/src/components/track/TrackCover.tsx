import React from "react";
import Image from "next/image";
import Grain from "../Grain";
import { motion, AnimatePresence } from "framer-motion";

interface TrackCoverProps {
  imageUrl?: string | null;
  artist?: string;
  name?: string;
  internationalName?: string;
  url?: string;
  counterText?: string;
  blurImage?: boolean;
  showAnswerOverlay?: boolean;
  className?: string;
  children?: React.ReactNode;
  turn?: number;
}

export default function TrackCover({
  imageUrl,
  artist = "",
  name = "",
  internationalName = "",
  url,
  counterText,
  blurImage = false,
  showAnswerOverlay = false,
  className = "",
  children,
  turn,
}: TrackCoverProps) {
  const isClickable = !!url;

  const handleClick = () => {
    if (isClickable && url) {
      window.open(url, "_blank");
    }
  };

  const showIntName =
    internationalName &&
    name &&
    internationalName.toLowerCase().replace(/\s+/g, "") !==
      name.toLowerCase().replace(/\s+/g, "");

  return (
    <section
      onClick={handleClick}
      className={`track-cover relative overflow-hidden rounded-lg ${
        isClickable
          ? "cursor-pointer transition-all duration-300 ease-out hover:scale-102 active:scale-95"
          : ""
      } ${blurImage ? "blurred" : ""} ${className}`}
    >
      <Grain id="track-grain" baseFrequency="0.9" scale="0.8" />
      {imageUrl ? (
        <div className="relative aspect-square h-full w-full">
          {/* Image propre en arrière-plan */}
          <Image
            src={imageUrl}
            alt={"Cover " + turn}
            width={250}
            height={250}
            className="h-full w-full object-cover"
            priority
          />
          {/* Image filtrée au-dessus, dont on anime l'opacité */}
          <Image
            src={imageUrl}
            alt={"Cover blurred " + turn}
            width={250}
            height={250}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              blurImage ? "opacity-100 transition-none" : "opacity-0"
            }`}
            style={{
              filter: "url(#track-grain) grayscale(0.8)",
            }}
            priority
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-gray-700 text-sm text-gray-400">
          {"Pas d'image"}
        </div>
      )}

      {/* Answer overlay */}
      <AnimatePresence>
        {showAnswerOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-black/75 px-8"
          >
            <p className="text-base text-gray-300">La réponse est :</p>
            <p className="text-center text-xl font-bold text-(--white)">
              {artist}
            </p>
            <div className="flex flex-col items-center">
              <p className="text-center text-lg text-(--white)">{name}</p>
              {showIntName && (
                <p className="text-md text-center text-(--grey)/50 italic">
                  {internationalName}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Default overlays (only show if not revealing answer) */}
      {!showAnswerOverlay && (
        <>
          {/* Bottom left/right info on hover/clickable results */}
          {isClickable && (artist || name) && (
            <div className="pointer-events-none absolute right-0 bottom-0 z-10 flex w-full flex-col p-2 text-right">
              {artist && (
                <span className="artist-name text-sm font-semibold wrap-anywhere">
                  {artist}
                </span>
              )}
              {name && (
                <span className="track-name text-lg font-bold wrap-anywhere">
                  {name}
                </span>
              )}
            </div>
          )}

          {/* Stepper / custom children overlay */}
          {children}

          {/* Vignette styling for readable text/controls */}
          <div className="overlay-cover pointer-events-none absolute inset-0"></div>
        </>
      )}

      {/* Counter indicator */}
      {counterText && (
        <div className="pointer-events-none absolute top-2 right-4 z-10 flex flex-col text-center">
          <p className="text-sm text-(--white)">{counterText}</p>
        </div>
      )}
    </section>
  );
}
