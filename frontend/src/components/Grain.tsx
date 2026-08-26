"use client";

export default function Grain({
  id = "grain",
  baseFrequency,
  scale,
}: {
  id?: string;
  baseFrequency: string | number;
  scale: string | number;
}) {
  return (
    <svg
      className="pointer-events-none fixed top-0 left-0"
      width="0"
      height="0"
      aria-hidden="true"
    >
      <filter
        id={id}
        colorInterpolationFilters="sRGB"
        primitiveUnits="objectBoundingBox"
      >
        {/* Génération du bruit : baseFrequency contrôle la finesse du grain */}
        <feTurbulence
          type="fractalNoise"
          baseFrequency={baseFrequency}
          numOctaves="4"
        />
        {/* Déplacement/déformation des pixels par le bruit */}
        <feDisplacementMap
          in="SourceGraphic"
          scale={scale}
          xChannelSelector="R"
        />
        <feBlend in2="SourceGraphic" />
      </filter>
    </svg>
  );
}
