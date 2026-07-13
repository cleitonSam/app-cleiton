import React from "react";

// A fênix. Vive num arquivo só porque agora aparece no app, no login e no admin.
// mood: "cheer" (padrão) · "happy" (olhos fechados, faíscas) · "soft" (olhos baixos)
export default function PhoenixMascot({ mood }) {
  const happy = mood === "happy";
  const soft = mood === "soft";

  return (
    <svg
      className={"phoenixsvg" + (happy ? " ph-happy" : "")}
      viewBox="0 0 120 120"
      width="88"
      height="88"
      role="img"
      aria-label="fênix"
    >
      <defs>
        <linearGradient id="phgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3FD0E6" />
          <stop offset="1" stopColor="#1F5FE6" />
        </linearGradient>
        <linearGradient id="phwing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7FE3EE" />
          <stop offset="1" stopColor="#2A6BE8" />
        </linearGradient>
      </defs>
      <g className="phbob">
        <ellipse cx="60" cy="62" rx="42" ry="40" fill="#0FB5C7" opacity="0.10" />
        <path d="M58 56 C44 44 30 42 14 32 C24 48 26 56 40 62 C47 65 53 63 58 60 Z" fill="url(#phwing)" />
        <path d="M62 56 C76 44 90 42 106 32 C96 48 94 56 80 62 C73 65 67 63 62 60 Z" fill="url(#phwing)" />
        <path d="M52 57 C42 49 34 47 24 41" stroke="#D6F4F9" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.75" />
        <path d="M68 57 C78 49 86 47 96 41" stroke="#D6F4F9" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.75" />
        <path d="M60 78 C55 90 51 99 49 109 C57 100 58 97 60 91 C62 97 63 100 71 109 C69 99 65 90 60 78 Z" fill="url(#phgrad)" />
        <path d="M60 46 C70 46 75 56 75 66 C75 78 68 86 60 86 C52 86 45 78 45 66 C45 56 50 46 60 46 Z" fill="url(#phgrad)" />
        <circle cx="60" cy="44" r="13" fill="url(#phgrad)" />
        <path d="M54 33 C56 24 59 22 58 15 C62 21 61 27 62 32 Z" fill="#3FD0E6" />
        <path d="M63 33 C65 25 68 23 68 17 C70 24 68 29 66 33 Z" fill="#0FB5C7" />
        <path d="M56 47 L64 47 L60 54 Z" fill="#F0A63C" />
        {happy ? (
          <>
            <path d="M50 42 Q54 38 58 42" stroke="#0C1A33" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M62 42 Q66 38 70 42" stroke="#0C1A33" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </>
        ) : soft ? (
          <>
            <path d="M50 42 Q54 45 58 42" stroke="#0C1A33" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M62 42 Q66 45 70 42" stroke="#0C1A33" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="54" cy="42" r="3" fill="#0C1A33" />
            <circle cx="66" cy="42" r="3" fill="#0C1A33" />
            <circle cx="55.1" cy="41" r="1" fill="#fff" />
            <circle cx="67.1" cy="41" r="1" fill="#fff" />
          </>
        )}
        {happy && (
          <g fill="#7FE3EE">
            <path d="M22 24 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5 Z" />
            <path d="M97 22 l1.2 2.4 2.4 1.2 -2.4 1.2 -1.2 2.4 -1.2 -2.4 -2.4 -1.2 2.4 -1.2 Z" />
          </g>
        )}
      </g>
    </svg>
  );
}
