// components/GrainedBackground.tsx
import React from "react";

import Grain from "./Grain";

export default function GrainedBackground({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#181818]">
      {/* Filtre de grain SVG global */}
      <Grain baseFrequency=".5" scale=".2" />

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
            ry="40%"
            fill="url(#grad-1)"
            style={{
              filter: "blur(80px)",
              transformOrigin: "50% 50%",
              transform: "rotate(-20deg)",
            }}
          />
          <ellipse
            cx="70%"
            cy="100%"
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
