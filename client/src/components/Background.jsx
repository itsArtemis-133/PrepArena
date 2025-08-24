// client/src/components/Background.jsx
import React from "react";

/**
 * Minimal background:
 *  - Solid neutral base (light/dark aware via CSS vars)
 *  - Ultra‑subtle noise to prevent banding
 *  - Zero animation, zero gradients
 */
export default function Background() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      {/* Base */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "rgb(var(--app-bg))",
        }}
      />
      {/* Film grain (extremely subtle) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025] dark:opacity-[0.035] mix-blend-normal"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          backgroundSize: "140px 140px",
        }}
      />
    </div>
  );
}
