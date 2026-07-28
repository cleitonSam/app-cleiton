import React from "react";

// O símbolo da marca: badge CS (preto, degradê charcoal). Substituiu a fênix
// quando o app entrou na identidade Preto & Branco do Cleiton Sampaio.
// Mantém o nome/props (mood) pra não quebrar quem já usa; o badge é fixo.
export default function PhoenixMascot({ mood }) {
  return (
    <svg
      className="phoenixsvg"
      viewBox="0 0 120 120"
      width="88"
      height="88"
      role="img"
      aria-label="Cleiton Sampaio"
    >
      <defs>
        <linearGradient id="csbadgegrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2C2C30" />
          <stop offset="0.55" stopColor="#161618" />
          <stop offset="1" stopColor="#050506" />
        </linearGradient>
      </defs>
      <g className="phbob">
        <rect x="16" y="16" width="88" height="88" rx="25" fill="url(#csbadgegrad)" />
        <rect x="16.75" y="16.75" width="86.5" height="86.5" rx="24.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.09" />
        <text
          x="60"
          y="64"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#F4F3F1"
          fontFamily="'Bricolage Grotesque',sans-serif"
          fontWeight="800"
          fontSize="44"
          letterSpacing="-1.5"
        >
          CS
        </text>
      </g>
    </svg>
  );
}
