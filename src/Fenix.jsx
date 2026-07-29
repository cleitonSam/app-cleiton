import React from "react";

// O símbolo da marca: badge com o CHEVRON DUPLO apontando pra cima ("vamos pra
// cima" — evolução, subir um degrau cada dia). Preto & Branco do Cleiton Sampaio.
// Mantém o nome/props (mood) pra não quebrar quem já usa; o badge é fixo.
export default function PhoenixMascot({ mood }) {
  return (
    <svg
      className="phoenixsvg"
      viewBox="0 0 512 512"
      width="88"
      height="88"
      role="img"
      aria-label="Cleiton Sampaio"
    >
      <defs>
        <linearGradient id="csbadgegrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2C2C30" />
          <stop offset="1" stopColor="#050506" />
        </linearGradient>
      </defs>
      <g className="phbob">
        <rect width="512" height="512" rx="116" fill="url(#csbadgegrad)" />
        <polyline points="146,268 256,158 366,268" fill="none" stroke="#FFFFFF" strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="146,356 256,246 366,356" fill="none" stroke="#FFFFFF" strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
