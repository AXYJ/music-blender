"use client";

import { useEffect, useRef, useState } from "react";

interface InfoProps {
  id: string;
  children: React.ReactNode;
  visible: boolean;
}

export default function Info({ id, children, visible }: InfoProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    leftRelative: number;
    width: number;
    arrowLeft: number;
  } | null>(null);

  useEffect(() => {
    if (!visible || !tooltipRef.current) return;

    const updatePosition = () => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const trigger = tooltip.parentElement;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const w = triggerRect.width;

      // Tooltip width is 320px max, clamped to screen size on mobile
      const tooltipWidth = Math.min(320, viewportWidth - 32);

      // Center above the trigger button in viewport coordinates
      const triggerCenterViewport = triggerRect.left + w / 2;
      const preferredTooltipLeftViewport =
        triggerCenterViewport - tooltipWidth / 2;

      // Keep inside the viewport bounds (16px padding on left/right edges)
      const clampedTooltipLeftViewport = Math.max(
        16,
        Math.min(
          preferredTooltipLeftViewport,
          viewportWidth - tooltipWidth - 16,
        ),
      );

      // Calculate shift from preferred centering
      const shift = clampedTooltipLeftViewport - preferredTooltipLeftViewport;

      // Tooltip left position relative to the relative button parent
      const leftRelative = w / 2 - tooltipWidth / 2 + shift;

      // Arrow position relative to the tooltip box
      const arrowLeft = triggerCenterViewport - clampedTooltipLeftViewport;

      setCoords({ leftRelative, width: tooltipWidth, arrowLeft });
    };

    // Calculate position immediately when visible
    updatePosition();

    // Listen to resize to adapt when screen orientation changes
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [visible]);

  // Use absolute positioning relative to the button trigger so that the browser
  // scrolls it natively on the compositor thread (no parallax scroll lag).
  const style =
    coords && visible
      ? {
          position: "absolute" as const,
          left: `${coords.leftRelative}px`,
          bottom: "100%",
          width: `${coords.width}px`,
          marginBottom: "8px",
          top: "auto",
          right: "auto",
          transform: "none",
        }
      : {
          display: "none",
        };

  const arrowStyle = coords
    ? {
        left: `${coords.arrowLeft}px`,
        transform: "translateX(-50%)",
      }
    : {};

  return (
    <div
      id={id}
      ref={tooltipRef}
      style={style}
      className={`z-50 rounded-xl border border-(--white)/10 bg-(--accent) p-2 shadow-2xl ${visible ? "flex" : "hidden"}`}
      role="tooltip"
    >
      {children}
      {/* Arrow pointing to the info button */}
      <div
        style={arrowStyle}
        className="absolute top-full h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-(--accent)"
      />
    </div>
  );
}
