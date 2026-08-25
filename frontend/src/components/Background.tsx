// components/GrainedBackground.tsx
import React from "react";

export default function GrainedBackground({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#181818]">
      {/* 1. Définition du filtre de grain SVG (invisible dans le flux) */}
      <svg
        className="pointer-events-none fixed top-0 left-0"
        width="0"
        height="0"
        aria-hidden="true"
      >
        <filter
          id="grain"
          colorInterpolationFilters="sRGB"
          primitiveUnits="objectBoundingBox"
        >
          {/* Génération du bruit : baseFrequency contrôle la finesse du grain */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.5"
            numOctaves="4"
          />
          {/* Déplacement/déformation des pixels par le bruit */}
          <feDisplacementMap
            in="SourceGraphic"
            scale="0.2"
            xChannelSelector="R"
          />
          <feBlend in2="SourceGraphic" />
        </filter>
      </svg>

      {/* 2. Le visuel SVG en fond */}
      <svg
        className="pointer-events-none fixed inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0E0712" />
            <stop offset="100%" stopColor="#770FB8" />
          </linearGradient>
        </defs>

        {/* Le groupe 'g' applique le filtre de grain */}
        <g style={{ filter: "url(#grain)" }}>
          {/* Fond sombre */}
          <rect width="100%" height="100%" fill="#181818" />

          {/* Formes avec flou CSS intense pour créer le dégradé doux */}
          <ellipse
            cx="10%"
            cy="0%"
            rx="50%"
            ry="30%"
            fill="url(#grad-1)"
            style={{
              filter: "blur(80px)",
              transformOrigin: "50% 50%",
              transform: "rotate(-20deg)",
            }}
          />
          <ellipse
            cx="80%"
            cy="70%"
            rx="50%"
            ry="40%"
            fill="url(#grad-1)"
            style={{
              filter: "blur(70px)",
              transformOrigin: "50% 50%",
              transform: "rotate(-20deg)",
            }}
          />
        </g>
      </svg>

      {/* 3. Contenu de ta page au-dessus du fond */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
