import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));

// ─── Base de dados ────────────────────────────────────────────────────────────
// 2247 exercícios com vídeo (biblioteca MuscleWiki em pt-BR) e 5671 alimentos
// (base brasileira). Carregados uma vez na memória do processo.
let EXERCICIOS = [];
let ALIMENTOS = [];
let porGrupo = new Map();
let porId = new Map();

export async function carregarDados() {
  const [ex, al] = await Promise.all([
    readFile(join(AQUI, "dados", "exercicios.json"), "utf8"),
    readFile(join(AQUI, "dados", "alimentos.json"), "utf8"),
  ]);
  EXERCICIOS = JSON.parse(ex);
  ALIMENTOS = JSON.parse(al);

  porGrupo = new Map();
  porId = new Map();
  for (const e of EXERCICIOS) {
    porId.set(e.id, e);
    if (!porGrupo.has(e.grupo)) porGrupo.set(e.grupo, []);
    porGrupo.get(e.grupo).push(e);
  }
  console.log(`[treino] ${EXERCICIOS.length} exercícios, ${ALIMENTOS.length} alimentos carregados`);
}

export const grupos = () => [...porGrupo.keys()];
export const exercicioPorId = (id) => porId.get(id) || null;

/** Lista compacta de um grupo (sem os campos longos), pra montar a tela da biblioteca. */
export function listarGrupo(grupo, { nivel, equip } = {}) {
  let lista = porGrupo.get(grupo) || [];
  if (nivel) lista = lista.filter((e) => niveis(nivel).includes(e.nivel));
  if (equip && equip.length) lista = lista.filter((e) => equipCasa(equip, e.equip));
  return lista.map(compacto);
}

export function buscarExercicio(termo) {
  const t = (termo || "").toLowerCase().trim();
  if (!t) return [];
  return EXERCICIOS.filter((e) => e.nome.toLowerCase().includes(t)).slice(0, 40).map(compacto);
}

const compacto = (e) => ({ id: e.id, nome: e.nome, grupo: e.grupo, nivel: e.nivel, equip: e.equip, temVideo: e.videos.length > 0 });

// níveis "até o informado": um intermediário pode fazer exercício de iniciante
const ORDEM_NIVEL = ["Novato", "Iniciante", "Intermediário", "Avançado"];
function niveis(nivelAluno) {
  const alvo = { Iniciante: 1, Intermediário: 2, Avançado: 3 }[nivelAluno] ?? 1;
  return ORDEM_NIVEL.filter((_, i) => i <= alvo + 1); // um degrau acima é permitido
}

// equipamentos disponíveis do aluno vs equipamento do exercício
function equipCasa(disponiveis, equipEx) {
  const e = (equipEx || "").toLowerCase();
  const tem = (k) => disponiveis.includes(k);
  if (/peso corporal|corpo/.test(e)) return true; // sempre dá
  if (/halter/.test(e)) return tem("halteres") || tem("academia");
  if (/barra/.test(e)) return tem("barra") || tem("academia");
  if (/m[áa]quina|cabo|polia|smith/.test(e)) return tem("academia");
  return tem("academia"); // desconhecido: só na academia
}

// ─── Divisão de treino por frequência (regra da anamnese) ─────────────────────
const SPLITS = {
  1: { divisao: "Full Body", dias: [["Peito", "Costas", "Quadríceps", "Posterior de coxa", "Ombro (frontal)", "Bíceps", "Tríceps", "Abdômen"]] },
  2: {
    divisao: "Full Body (2x)",
    dias: [
      ["Peito", "Costas", "Quadríceps", "Ombro (frontal)", "Bíceps", "Abdômen"],
      ["Costas", "Peito", "Posterior de coxa", "Glúteos", "Tríceps", "Panturrilha"],
    ],
  },
  3: {
    divisao: "ABC",
    dias: [
      ["Peito", "Ombro (frontal)", "Tríceps"],
      ["Costas", "Trapézio", "Bíceps"],
      ["Quadríceps", "Posterior de coxa", "Glúteos", "Panturrilha", "Abdômen"],
    ],
  },
  4: {
    divisao: "Superior / Inferior (2x)",
    dias: [
      ["Peito", "Costas", "Ombro (frontal)", "Bíceps", "Tríceps"],
      ["Quadríceps", "Posterior de coxa", "Glúteos", "Panturrilha", "Abdômen"],
      ["Costas", "Peito", "Ombro (posterior)", "Trapézio", "Bíceps", "Tríceps"],
      ["Quadríceps", "Posterior de coxa", "Glúteos", "Panturrilha", "Oblíquos"],
    ],
  },
  5: {
    divisao: "ABCDE",
    dias: [
      ["Peito", "Tríceps"],
      ["Costas", "Bíceps"],
      ["Ombro (frontal)", "Ombro (posterior)", "Trapézio"],
      ["Quadríceps", "Panturrilha"],
      ["Posterior de coxa", "Glúteos", "Abdômen"],
    ],
  },
  6: {
    divisao: "Push / Pull / Legs (2x)",
    dias: [
      ["Peito", "Ombro (frontal)", "Tríceps"],
      ["Costas", "Ombro (posterior)", "Trapézio", "Bíceps"],
      ["Quadríceps", "Posterior de coxa", "Glúteos", "Panturrilha"],
      ["Peito", "Ombro (frontal)", "Tríceps", "Abdômen"],
      ["Costas", "Ombro (posterior)", "Trapézio", "Bíceps"],
      ["Quadríceps", "Posterior de coxa", "Glúteos", "Panturrilha"],
    ],
  },
};

// ─── Objetivo → séries / repetições / descanso ────────────────────────────────
export function prescricao(objetivo) {
  switch (objetivo) {
    case "Ganho de massa":
    case "Hipertrofia":
      return { series: 4, reps: "8–12", descanso: "60–90s", cardio: "10 min leve no fim, opcional" };
    case "Emagrecimento":
      return { series: 3, reps: "12–15", descanso: "30–45s", cardio: "20–30 min após o treino" };
    case "Ganho de força":
      return { series: 5, reps: "4–6", descanso: "2–3 min", cardio: "aquecimento de 5 min" };
    default:
      return { series: 3, reps: "10–15", descanso: "45–60s", cardio: "15 min, se gostar" };
  }
}

// ─── Gerador de plano ─────────────────────────────────────────────────────────
/**
 * Monta um plano de treino a partir da anamnese, usando exercícios REAIS da
 * biblioteca (com vídeo). É determinístico: mesmo sem IA, o aluno já tem um
 * treino que faz sentido. A IA depois ajusta em cima disso.
 */
export function gerarPlano(anamnese = {}) {
  const freq = Math.min(6, Math.max(1, Number(anamnese.frequencia) || 3));
  const nivel = anamnese.nivel || "Iniciante";
  const objetivo = anamnese.objetivo || "Ganho de massa";
  const equip = Array.isArray(anamnese.equipamentos) && anamnese.equipamentos.length ? anamnese.equipamentos : ["academia"];
  const split = SPLITS[freq];
  const presc = prescricao(objetivo);

  // quantos exercícios por grupo, pelo nível
  // Quantos exercícios cabem no treino, PELO TEMPO que a pessoa tem (a resposta da
  // anamnese vira volume real): 30 min = enxuto, 60+ = treino completo. O nível
  // ajusta um pouco pra cima/baixo. É isso que faz o plano "bater com as respostas".
  const alvoPorTempo = { "30 min": 4, "45 min": 6, "60 min": 7, "60+ min": 9 }[anamnese.tempo] || 6;
  const bonusNivel = nivel === "Avançado" ? 1 : nivel === "Iniciante" ? -1 : 0;
  const maxPorGrupo = nivel === "Avançado" ? 3 : nivel === "Intermediário" ? 2 : 1;

  const letras = "ABCDEF";
  const usados = new Set(); // não repetir o mesmo exercício no plano todo

  const treinos = split.dias.map((grupos, i) => {
    const alvo = Math.max(grupos.length, alvoPorTempo + bonusNivel); // pelo menos 1 por grupo
    // candidatos ordenados por grupo (carro-chefe primeiro), sem repetir no plano
    const fila = new Map(); // grupo -> [candidatos]
    for (const grupo of grupos) {
      fila.set(
        grupo,
        (porGrupo.get(grupo) || [])
          .filter((e) => niveis(nivel).includes(e.nivel))
          .filter((e) => equipCasa(equip, e.equip))
          .filter((e) => !usados.has(e.id))
          .sort((a, b) => pontuar(grupo, b) - pontuar(grupo, a))
      );
    }
    const contagem = Object.fromEntries(grupos.map((g) => [g, 0]));
    const exercicios = [];

    const pegar = (grupo) => {
      const lista = fila.get(grupo);
      const e = lista && lista.find((x) => !usados.has(x.id));
      if (!e) return false;
      usados.add(e.id);
      contagem[grupo]++;
      exercicios.push({ id: e.id, nome: e.nome, grupo: e.grupo, equip: e.equip, series: presc.series, reps: presc.reps, descanso: presc.descanso });
      return true;
    };

    // 1ª passada: garante ao menos 1 exercício de cada grupo do dia.
    for (const grupo of grupos) pegar(grupo);
    // 2ª+: completa até o alvo do tempo, dando prioridade aos grupos grandes (na ordem).
    let voltas = 0;
    while (exercicios.length < alvo && voltas < 30) {
      voltas++;
      let addou = false;
      for (const grupo of grupos) {
        if (exercicios.length >= alvo) break;
        if (contagem[grupo] < maxPorGrupo && pegar(grupo)) addou = true;
      }
      if (!addou) break; // acabaram os candidatos
    }

    return { nome: `Treino ${letras[i]}`, foco: resumirFoco(grupos), grupos, exercicios };
  });

  return {
    divisao: split.divisao,
    frequencia: freq,
    objetivo,
    nivel,
    prescricao: presc,
    treinos,
    geradoEm: null, // o cliente carimba a data (o servidor não tem Date determinístico nos scripts)
  };
}

// Exercícios "carro-chefe" de cada grupo: os que um bom personal põe primeiro.
const PREFERIDOS = {
  "Peito": ["supino reto", "supino inclinado", "supino", "crucifixo", "peitoral"],
  "Costas": ["puxada", "remada curvada", "remada", "barra fixa", "levantamento terra"],
  "Ombro (frontal)": ["desenvolvimento", "elevação frontal", "elevação lateral"],
  "Ombro (posterior)": ["crucifixo inverso", "elevação lateral", "remada alta"],
  "Bíceps": ["rosca direta", "rosca alternada", "rosca martelo", "rosca"],
  "Tríceps": ["tríceps testa", "tríceps corda", "tríceps pulley", "mergulho", "tríceps"],
  "Quadríceps": ["agachamento livre", "leg press", "cadeira extensora", "agachamento", "afundo"],
  "Posterior de coxa": ["stiff", "mesa flexora", "cadeira flexora", "levantamento terra"],
  "Glúteos": ["elevação pélvica", "hip thrust", "agachamento", "cadeira abdutora"],
  "Panturrilha": ["panturrilha em pé", "panturrilha sentado", "panturrilha", "gêmeos"],
  "Abdômen": ["abdominal", "prancha", "elevação de pernas"],
  "Oblíquos": ["prancha lateral", "rotação", "abdominal oblíquo"],
  "Trapézio": ["encolhimento"],
  "Trapézio médio": ["encolhimento", "remada alta"],
  "Antebraço": ["rosca inversa", "rosca punho"],
  "Mãos": [],
};

/** Pontua um exercício pro seu grupo: carro-chefe ganha mais; barra/halteres/máquina somam. */
function pontuar(grupo, ex) {
  const nome = (ex.nome || "").toLowerCase();
  const lista = PREFERIDOS[grupo] || [];
  let p = 0;
  // quanto mais no topo da lista de preferidos, mais pontos
  for (let i = 0; i < lista.length; i++) {
    if (nome.includes(lista[i])) { p += 20 - i * 2; break; }
  }
  const eq = (ex.equip || "").toLowerCase();
  if (/barra|halter|m[áa]quina/.test(eq)) p += 3; // compostos/equipados primeiro
  if (/peso corporal/.test(eq)) p += 1;
  // nomes curtos tendem a ser o movimento básico (não uma variação)
  p += Math.max(0, 4 - Math.floor(nome.length / 12));
  return p;
}

function resumirFoco(grupos) {
  const map = {
    "Peito": "Peito", "Costas": "Costas", "Ombro (frontal)": "Ombro", "Ombro (posterior)": "Ombro",
    "Bíceps": "Braço", "Tríceps": "Braço", "Quadríceps": "Perna", "Posterior de coxa": "Perna",
    "Glúteos": "Glúteo", "Panturrilha": "Perna", "Trapézio": "Costas", "Abdômen": "Core", "Oblíquos": "Core",
  };
  const nomes = [...new Set(grupos.map((g) => map[g] || g))];
  return nomes.slice(0, 3).join(" · ");
}

// ─── Alimentos ────────────────────────────────────────────────────────────────
export function buscarAlimentos(termo, limite = 30) {
  const t = (termo || "").toLowerCase().trim();
  if (!t) return [];
  const palavras = t.split(/\s+/);
  return ALIMENTOS.filter((a) => palavras.every((p) => a.nome.toLowerCase().includes(p)))
    .slice(0, limite);
}

// ─── Cálculo nutricional (Mifflin-St Jeor) ────────────────────────────────────
/** Metabolismo basal + gasto total + metas de macro conforme o objetivo. */
export function calcularNutricao(anamnese = {}) {
  const kg = Number(anamnese.peso) || 70;
  const cm = Number(anamnese.altura) || 170;
  const idade = Number(anamnese.idade) || 30;
  const sexo = anamnese.sexo === "Feminino" ? "F" : "M";
  const freq = Number(anamnese.frequencia) || 3;
  const objetivo = anamnese.objetivo || "Ganho de massa";

  const bmr = sexo === "M"
    ? 10 * kg + 6.25 * cm - 5 * idade + 5
    : 10 * kg + 6.25 * cm - 5 * idade - 161;

  // fator de atividade pela frequência de treino
  const fator = freq <= 1 ? 1.3 : freq <= 3 ? 1.45 : freq <= 5 ? 1.6 : 1.725;
  const tdee = Math.round(bmr * fator);

  // ajuste calórico pelo objetivo
  let ajuste = 0;
  if (/massa|hipertrofia/i.test(objetivo)) ajuste = 400; // superávit p/ engordar
  else if (/emagre/i.test(objetivo)) ajuste = -450; // déficit p/ emagrecer
  const kcalMeta = Math.round(tdee + ajuste);

  // macros: proteína 2 g/kg, gordura ~0,9 g/kg, resto carbo
  const prot = Math.round(kg * 2);
  const gord = Math.round(kg * 0.9);
  const carb = Math.max(0, Math.round((kcalMeta - prot * 4 - gord * 9) / 4));

  return {
    bmr: Math.round(bmr),
    tdee,
    kcalMeta,
    objetivo,
    macros: { prot, carb, gord },
    referencia: ajuste > 0 ? "superávit para ganhar peso" : ajuste < 0 ? "déficit para emagrecer" : "manutenção",
  };
}

// índice compacto de exercícios (nome+grupo) pra dar de contexto à IA sem estourar tokens
export function indiceParaIA(porGrupoN = 25) {
  const porG = {};
  for (const e of EXERCICIOS) {
    (porG[e.grupo] ||= []).push(e.nome);
  }
  const linhas = Object.entries(porG).map(([g, nomes]) => `${g}: ${[...new Set(nomes)].slice(0, porGrupoN).join(", ")}`);
  return linhas.join("\n");
}

// ─── Casar o nome que a IA escolheu com um exercício REAL da biblioteca ────────
// A IA pode escrever "Supino reto" e a biblioteca ter "Supino Reto com Barra".
// Casa por: igual → contém → sobreposição de palavras. Preferindo o mesmo grupo.
const semAcento = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const PALAVRA_VAZIA = new Set(["de", "com", "na", "no", "da", "do", "e", "o", "a", "em", "para", "the", "of"]);

export function casarExercicio(nome, grupo) {
  const alvo = semAcento(nome);
  if (!alvo) return null;
  const tokensAlvo = alvo.split(" ").filter((w) => w.length > 2 && !PALAVRA_VAZIA.has(w));

  let melhor = null;
  let melhorNota = 0;
  const universo = grupo && porGrupo.has(grupo) ? porGrupo.get(grupo) : EXERCICIOS;

  const avaliar = (lista, bonusGrupo) => {
    for (const e of lista) {
      const nomeEx = semAcento(e.nome);
      let nota = 0;
      if (nomeEx === alvo) nota = 100;
      else if (nomeEx.includes(alvo) || alvo.includes(nomeEx)) nota = 60;
      else {
        const tokensEx = new Set(nomeEx.split(" "));
        const comuns = tokensAlvo.filter((w) => tokensEx.has(w)).length;
        if (comuns) nota = 20 + comuns * 8;
      }
      if (!nota) continue;
      nota += bonusGrupo; // preferir o grupo certo
      nota += pontuar(e.grupo, e) * 0.1; // desempata pelo carro-chefe
      if (nota > melhorNota) { melhorNota = nota; melhor = e; }
    }
  };

  avaliar(universo, 10);
  if (melhorNota < 40) avaliar(EXERCICIOS, 0); // não achou bom no grupo? procura em tudo
  return melhorNota >= 28 ? melhor : null;
}
