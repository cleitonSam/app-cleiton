import React from "react";

// ─── Ícones em linha ──────────────────────────────────────────────────────────
// Conjunto próprio (nada de biblioteca), traço 2px, cantos arredondados, herdam
// a cor via currentColor. Um ícone pra cada coisa do treino.

const svg = (filhos, extra = {}) => (props) =>
  (
    <svg
      viewBox="0 0 24 24"
      width={props.size || 22}
      height={props.size || 22}
      fill="none"
      stroke="currentColor"
      strokeWidth={props.sw || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...extra}
      {...props}
    >
      {filhos}
    </svg>
  );

export const IcHalter = svg(
  <>
    <path d="M6.5 8v8M17.5 8v8" />
    <path d="M4 9.5v5M20 9.5v5" />
    <path d="M6.5 12h11" />
  </>
);

export const IcBarra = svg(
  <>
    <path d="M3 10v4M6 8v8M18 8v8M21 10v4" />
    <path d="M6 12h12" />
  </>
);

export const IcMaquina = svg(
  <>
    <path d="M4 4v16M4 8h6l4 4-4 4H4" />
    <circle cx="18" cy="12" r="3" />
  </>
);

export const IcCorpo = svg(
  <>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v6M8 10l4-1 4 1M9 20l3-7 3 7" />
  </>
);

export const IcChama = svg(
  <path d="M12 3c1 3-1 4-1 6a3 3 0 0 0 6 0c0-1-.5-2-1-3 2 1 3 3.5 3 6a7 7 0 1 1-14 0c0-3 2-5 3-7 .5 2 2 2.5 2.5 1 .3-1 .2-2-1.5-3z" />
);

export const IcRelogio = svg(
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </>
);

export const IcMaca = svg(
  <>
    <path d="M12 7c-1.5-2-5-2-6 1-1 3 1 8 3 9 1 .5 2 .5 3 0 1 .5 2 .5 3 0 2-1 4-6 3-9-1-3-4.5-3-6-1z" />
    <path d="M12 7c0-2 .5-3 2-4" />
  </>
);

export const IcApito = svg(
  <>
    <path d="M3 12a5 5 0 0 1 5-5h9l-2 3 2 3H8a5 5 0 0 1-5-4z" />
    <circle cx="8" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <path d="M14 4v3" />
  </>
);

export const IcPlay = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none" />
  </>
);

export const IcTroca = svg(
  <>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </>
);

export const IcMais = svg(<path d="M12 5v14M5 12h14" />);
export const IcCheque = svg(<path d="M5 12.5l4.5 4.5L19 7" />);
export const IcChevron = svg(<path d="M9 6l6 6-6 6" />, { strokeWidth: 2.2 });
export const IcRaio = svg(<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none" />);
export const IcAlvo = svg(
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </>
);
export const IcEnviar = svg(<path d="M4 12l16-8-6 16-3-6-7-2z" />);
export const IcInfo = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </>
);
export const IcBalanca = svg(
  <>
    <path d="M12 3v3M6 6h12M6 6l-3 7a3 3 0 0 0 6 0zM18 6l-3 7a3 3 0 0 0 6 0z" />
    <path d="M9 21h6" />
  </>
);

// ─── Grupos musculares: cor + glyph ───────────────────────────────────────────
// Cada grupo ganha uma cor e um pequeno desenho, num badge com gradiente.
const G = {
  "Peito": { cor: ["#1F5FE6", "#4E86F0"], d: <path d="M4 8c3-1 5-1 8 1 3-2 5-2 8-1 0 5-3 8-8 8s-8-3-8-8z" /> },
  "Costas": { cor: ["#0FB5C7", "#3FD0E6"], d: <path d="M12 4v16M8 7l-4 3 4 3M16 7l4 3-4 3" /> },
  "Ombro (frontal)": { cor: ["#7A5CF0", "#9E86F5"], d: <><circle cx="12" cy="9" r="4" /><path d="M6 20a6 6 0 0 1 12 0" /></> },
  "Ombro (posterior)": { cor: ["#6A4FD0", "#8E76E5"], d: <><circle cx="12" cy="9" r="4" /><path d="M6 20a6 6 0 0 1 12 0" /></> },
  "Bíceps": { cor: ["#E88A2C", "#F5A94E"], d: <path d="M7 5v6a5 5 0 0 0 10 0c0-3-2-4-2-6M9 16c0 2 1 3 3 3s3-1 3-3" /> },
  "Tríceps": { cor: ["#C97824", "#E89A4E"], d: <path d="M8 4l-2 8a4 4 0 0 0 8 1l1-6M14 15c1 2 3 3 4 2" /> },
  "Antebraço": { cor: ["#D08A3C", "#EBAE68"], d: <path d="M6 5l3 9M9 14l6 5M9 14l5-2" /> },
  "Quadríceps": { cor: ["#1FA36E", "#3FC98E"], d: <path d="M9 3v7l-2 11M15 3v7l2 11M9 10h6" /> },
  "Posterior de coxa": { cor: ["#178A5E", "#38B07E"], d: <path d="M9 3v8l-2 10M15 3v8l2 10" /> },
  "Glúteos": { cor: ["#E85C8A", "#F57EAE"], d: <path d="M12 4c-4 0-6 3-6 7 0 3 2 5 3 5s2-2 3-2 2 2 3 2 3-2 3-5c0-4-2-7-6-7z" /> },
  "Panturrilha": { cor: ["#2E9E86", "#4EC0A6"], d: <path d="M10 3c-2 3-2 7 0 10l-1 8M14 3c2 3 2 8 0 11" /> },
  "Abdômen": { cor: ["#C98A24", "#E8AC4E"], d: <><rect x="8" y="4" width="8" height="16" rx="2" /><path d="M8 9h8M8 13h8M12 4v16" /></> },
  "Oblíquos": { cor: ["#B87A34", "#D89C58"], d: <path d="M8 4l8 4M8 9l8 4M8 14l8 4" /> },
  "Trapézio": { cor: ["#0A8A99", "#2EAEBE"], d: <path d="M12 4l8 6-3 2M12 4L4 10l3 2M12 4v14" /> },
  "Trapézio médio": { cor: ["#0A7A89", "#2E9EAE"], d: <path d="M12 4l8 6-3 2M12 4L4 10l3 2M12 4v14" /> },
  "Mãos": { cor: ["#5A6B87", "#7E8DA8"], d: <path d="M8 11V6M11 11V5M14 11V6M17 12V8M8 11c-2 2-1 6 2 8h4c3-1 3-4 3-6" /> },
};
const PADRAO = { cor: ["#5A6B87", "#7E8DA8"], d: <circle cx="12" cy="12" r="6" /> };

export function BadgeGrupo({ grupo, size = 34 }) {
  const g = G[grupo] || PADRAO;
  const id = "gg-" + (grupo || "x").replace(/[^a-z]/gi, "");
  return (
    <span style={{ display: "inline-flex", width: size, height: size, flex: "none" }}>
      <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={grupo}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={g.cor[0]} />
            <stop offset="1" stopColor={g.cor[1]} />
          </linearGradient>
        </defs>
        <rect x="0.5" y="0.5" width="23" height="23" rx="7" fill={`url(#${id})`} />
        <g stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="scale(0.72) translate(4.6 4.6)">
          {g.d}
        </g>
      </svg>
    </span>
  );
}

export const corGrupo = (grupo) => (G[grupo] || PADRAO).cor;

// ─── Equipamento ──────────────────────────────────────────────────────────────
export const IcMaquinaEq = svg(
  <>
    <rect x="3" y="4" width="4" height="16" rx="1" />
    <path d="M7 8h6l4 4-4 4H7" />
    <circle cx="19" cy="12" r="2" />
  </>
);
export const IcPolia = svg(
  <>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v5M8 12h8M8 12l-2 8M16 12l2 8" />
  </>
);

/** Ícone certo pro tipo de equipamento do exercício. */
export function IconeEquip({ equip, size = 16 }) {
  const e = (equip || "").toLowerCase();
  if (/barra/.test(e)) return <IcBarra size={size} />;
  if (/halter/.test(e)) return <IcHalter size={size} />;
  if (/cabo|polia/.test(e)) return <IcPolia size={size} />;
  if (/m[áa]quina|smith/.test(e)) return <IcMaquinaEq size={size} />;
  if (/corpo|peso corporal/.test(e)) return <IcCorpo size={size} />;
  return <IcHalter size={size} />;
}

// ─── Refeições / dieta ────────────────────────────────────────────────────────
export const IcCafe = svg(
  <>
    <path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
    <path d="M16 9h2a2 2 0 0 1 0 4h-2" />
    <path d="M8 3v2M11 3v2" />
  </>
);
export const IcPrato = svg(
  <>
    <circle cx="11" cy="12" r="7" />
    <circle cx="11" cy="12" r="3" />
    <path d="M20 4v7M20 4c-1.5 0-2 1-2 3s.5 3 2 3" />
  </>
);
export const IcLua = svg(<path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11z" />);
export const IcAgua = svg(<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" />);
export const IcGrafico = svg(
  <>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 16l3-4 3 2 4-6" />
  </>
);
export const IcCamera = svg(
  <>
    <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="13" r="3.5" />
  </>
);
export const IcLixo = svg(
  <>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </>
);
export const IcChamaMini = IcChama;

// ícone pra cada refeição pelo nome
export function IconeRefeicao({ nome, size = 20 }) {
  const n = (nome || "").toLowerCase();
  if (/café|cafe|manh/.test(n)) return <IcCafe size={size} />;
  if (/almo|jantar/.test(n)) return <IcPrato size={size} />;
  if (/ceia|noite/.test(n)) return <IcLua size={size} />;
  if (/lanche|pré|pós|pre|pos/.test(n)) return <IcMaca size={size} />;
  return <IcPrato size={size} />;
}
