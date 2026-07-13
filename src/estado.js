// ─── O estado do Linha ────────────────────────────────────────────────────────
// Formato, normalização, virada de dia e fusão entre aparelhos.
// Fica separado da tela porque agora o servidor e o app precisam concordar
// sobre o que é um "estado do Linha".

export const ESQUEMA = 5;

// Chave estável. A versão do formato mora DENTRO do estado, não no nome da chave —
// era assim que o "linha:v4" perdia o histórico de quem vinha de uma versão antiga.
export const CHAVE = "linha";
export const CHAVE_BACKUP = "linha:copia";
export const CHAVES_ANTIGAS = ["linha:v4", "linha:v3", "linha:v2", "linha:v1"];

// Guarda mais de um ano de histórico. O antigo cortava em 90 dias e jogava fora
// o dia mais velho em silêncio; agora, mesmo o que sai do corte já foi somado
// nos totais vitalícios, então nenhum número encolhe.
const TETO_HISTORICO = 400;

export const TIPS = [
  "Antes de pegar o celular de manhã, respira fundo e olha pra luz da janela. Já começa o dia mais calmo.",
  "Faz uma coisa de cada vez. Terminar uma tarefa dá mais gás do que começar cinco.",
  "Bebe um copo d'água agora. No fim da tarde, o cansaço às vezes é só sede.",
  "Toma o café perto da janela. Um pouco de sol de manhã ajuda você a dormir melhor à noite.",
  "Não precisa dar conta de tudo sozinho. Quando o peso apertar, manda uma mensagem pra alguém de confiança.",
  "No almoço, larga a tela. Comendo com calma você come mais, e é disso que você precisa agora.",
  "Quando a cabeça tá cheia, escreve as três tarefas num papel. Ajuda a parar de girar.",
  "Deixa a tarefa mais difícil pra manhã, quando você tá com mais energia.",
  "Uma caminhada de 10 minutos costuma destravar mais do que um café.",
  "Reserva uma hora na semana só pra pensar, sem trabalhar. É onde você vê se tá indo pro lugar certo.",
  "Dormir 7h30 faz o músculo crescer e a cabeça render. Não é tempo perdido.",
  "Se não deu tudo hoje, tudo bem. Amanhã tem mais.",
];

// ─── Datas ───────────────────────────────────────────────────────────────────
// Tudo em data LOCAL do aparelho: o "dia" do usuário é o dia do relógio dele.
export const iso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const isoMaisDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const ontem = () => isoMaisDias(-1);
export const anteontem = () => isoMaisDias(-2);

export const diaDoAno = () => {
  const n = new Date();
  const inicio = new Date(n.getFullYear(), 0, 0);
  return Math.floor((n - inicio) / 86400000);
};

export const chaveSemana = () => {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${wk}`;
};

export const letraDoDia = (dstr) => {
  const [y, m, dd] = String(dstr).split("-").map(Number);
  return ["D", "S", "T", "Q", "Q", "S", "S"][new Date(y, m - 1, dd).getDay()];
};

const SONO_VALIDOS = ["-6h", "6–7h", "7–8h", "8h+"];
const LOCAIS_VALIDOS = ["escritorio", "casa", "cliente"];

// ─── Estado padrão ───────────────────────────────────────────────────────────
export function estadoPadrao() {
  return {
    esquema: ESQUEMA,
    atualizadoEm: Date.now(),

    currentDate: iso(),
    energy: null,
    location: "escritorio",
    water: 0,
    sleep: null,
    gratitude: "",
    weekPriority: { wk: "", text: "" },
    reading: { title: "", total: 0, page: 0, lastReadDate: null, finished: 0, pagesAllTime: 0 },
    tipIndex: new Date().getDate() % TIPS.length,
    streak: 0,
    lastDoneDate: null,
    streakRecord: 0,
    barriersWon: 0,
    why: "",
    goal: "",
    journeyStart: iso(),
    handle: "",
    onboarded: false,
    xp: 0,
    challengeDoneDate: null,
    shields: 1,
    history: [],

    // Totais que NUNCA são truncados. O histórico tem teto; estes números, não.
    lifetime: { dias: 0, vitorias: 0, blocos: 0, kcal: 0, prot: 0 },

    vitorias: [
      { id: "empresa", label: "Empresa", hint: "Ex.: finalizar proposta da Red", text: "", done: false },
      { id: "saude", label: "Saúde", hint: "Ex.: treinar 40 min", text: "", done: false },
      { id: "vida", label: "Vida / estudo", hint: "Ex.: 20 min de inglês", text: "", done: false },
    ],
    items: [
      { id: "r1", t: "07:00", kind: "meal", title: "Café da manhã", detail: "3 ovos, aveia com leite integral, pasta de amendoim, banana, pão", kcal: 700, prot: 32, done: false },
      { id: "b1", t: "09:00", kind: "block", title: "Deep work da Fluxo", detail: "Construir empresa. Sem WhatsApp, sem Instagram.", kcal: 0, prot: 0, done: false },
      { id: "r2", t: "10:00", kind: "meal", title: "Lanche no escritório", detail: "Castanhas, iogurte integral, sanduíche natural", kcal: 420, prot: 18, done: false },
      { id: "r3", t: "12:00", kind: "meal", title: "Almoço", detail: "Arroz, feijão, 150g de frango ou carne, salada com azeite, fruta", kcal: 780, prot: 45, done: false },
      { id: "b2", t: "13:00", kind: "block", title: "Clientes e reuniões", detail: "Resolver, atender, alinhar. A tarde é pra operação.", kcal: 0, prot: 0, done: false },
      { id: "r4", t: "15:30", kind: "meal", title: "Vitamina (arma secreta)", detail: "300ml leite integral, aveia, banana, pasta de amendoim, mel", kcal: 500, prot: 22, done: false },
      { id: "b3", t: "16:00", kind: "block", title: "Fechar o dia", detail: "Pendências, delegar, preparar amanhã.", kcal: 0, prot: 0, done: false },
      { id: "r5", t: "19:00", kind: "meal", title: "Jantar", detail: "Arroz ou batata, 150g de proteína, legumes no azeite", kcal: 620, prot: 40, done: false },
      { id: "b4", t: "20:30", kind: "block", title: "Família ou inglês", detail: "Uma coisa só. Celular longe.", kcal: 0, prot: 0, done: false },
      { id: "r6", t: "21:30", kind: "meal", title: "Ceia (se couber)", detail: "Iogurte integral + castanhas, ou shake de leite com whey", kcal: 260, prot: 18, done: false },
    ],
    weight: { goal: 62, log: [] },

    // Treino: anamnese, plano gerado, cardápio, cargas por exercício e o que foi
    // feito hoje. Sincroniza entre aparelhos. Os chats de IA NÃO ficam aqui (são
    // grandes e efêmeros) — vivem só na tela enquanto aberta.
    treino: { anamnese: null, plano: null, dieta: null, cargas: {}, feito: { data: "", ids: [] } },
  };
}

// ─── Normalização ────────────────────────────────────────────────────────────
// Antes o carregamento fazia `{ ...estadoPadrao(), ...bruto }` — um espalhamento
// raso. Bastava o backup ter `weight` sem `log` pra derrubar o app inteiro numa
// tela branca. Aqui cada campo é conferido sozinho: o que estiver quebrado volta
// ao padrão DAQUELE campo, e o resto dos seus dados continua de pé.

const num = (v, padrao, min = -Infinity, max = Infinity) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};
const txt = (v, padrao = "", max = 4000) => (typeof v === "string" ? v.slice(0, max) : padrao);
const bool = (v, padrao = false) => (typeof v === "boolean" ? v : padrao);
const dataOuNulo = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export function normalizar(bruto) {
  const d = estadoPadrao();
  if (!bruto || typeof bruto !== "object") return d;

  const e = {
    ...d,
    esquema: ESQUEMA,
    atualizadoEm: num(bruto.atualizadoEm, Date.now(), 0),

    currentDate: dataOuNulo(bruto.currentDate) || d.currentDate,
    energy: bruto.energy == null ? null : num(bruto.energy, null, 1, 10),
    location: LOCAIS_VALIDOS.includes(bruto.location) ? bruto.location : d.location,
    water: num(bruto.water, 0, 0, 12),
    sleep: SONO_VALIDOS.includes(bruto.sleep) ? bruto.sleep : null,
    gratitude: txt(bruto.gratitude, "", 500),

    tipIndex: num(bruto.tipIndex, d.tipIndex, 0, TIPS.length - 1),
    streak: num(bruto.streak, 0, 0),
    lastDoneDate: dataOuNulo(bruto.lastDoneDate),
    streakRecord: num(bruto.streakRecord, 0, 0),
    barriersWon: num(bruto.barriersWon, 0, 0),
    why: txt(bruto.why, "", 1000),
    goal: txt(bruto.goal, "", 1000),
    journeyStart: dataOuNulo(bruto.journeyStart) || d.journeyStart,
    handle: txt(bruto.handle, "", 60),
    // Quem já tem dados salvos não pode cair no onboarding de novo.
    onboarded: bruto.onboarded === undefined ? true : bool(bruto.onboarded, true),
    xp: num(bruto.xp, 0, 0),
    challengeDoneDate: dataOuNulo(bruto.challengeDoneDate),
    shields: num(bruto.shields, 1, 0, 2),
  };

  // ── prioridade da semana
  const wp = bruto.weekPriority;
  e.weekPriority = wp && typeof wp === "object"
    ? { wk: txt(wp.wk, "", 12), text: txt(wp.text, "", 300) }
    : { ...d.weekPriority };

  // ── leitura
  const r = bruto.reading;
  e.reading = r && typeof r === "object"
    ? {
        title: txt(r.title, "", 200),
        total: num(r.total, 0, 0, 100000),
        page: num(r.page, 0, 0, 100000),
        lastReadDate: dataOuNulo(r.lastReadDate),
        finished: num(r.finished, 0, 0),
        pagesAllTime: num(r.pagesAllTime, 0, 0),
      }
    : { ...d.reading };
  // A página nunca pode passar do total do livro.
  if (e.reading.total > 0) e.reading.page = Math.min(e.reading.page, e.reading.total);

  // ── peso (uma pesagem por dia; a última do arquivo ganha)
  const w = bruto.weight;
  const pesos = new Map();
  for (const x of Array.isArray(w?.log) ? w.log : []) {
    if (x && dataOuNulo(x.date) && Number.isFinite(+x.kg)) {
      pesos.set(x.date, { date: x.date, kg: num(x.kg, 0, 30, 200) });
    }
  }
  e.weight = {
    goal: num(w?.goal, d.weight.goal, 40, 150),
    log: [...pesos.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };

  // ── as 3 vitórias: o rótulo/dica são fixos; o que vem do arquivo é texto e feito
  e.vitorias = d.vitorias.map((padrao) => {
    const achou = Array.isArray(bruto.vitorias) ? bruto.vitorias.find((v) => v && v.id === padrao.id) : null;
    return achou
      ? { ...padrao, text: txt(achou.text, "", 300), done: bool(achou.done) }
      : { ...padrao };
  });

  // ── a rotina (o dado de configuração mais importante do usuário)
  const itensBrutos = Array.isArray(bruto.items) ? bruto.items : null;
  e.items = itensBrutos
    ? itensBrutos
        .filter((i) => i && typeof i === "object")
        .map((i, idx) => ({
          id: txt(i.id, `x${idx}`, 40) || `x${idx}`,
          t: /^\d{2}:\d{2}$/.test(i.t) ? i.t : "12:00",
          kind: i.kind === "meal" ? "meal" : "block",
          title: txt(i.title, "", 200),
          detail: txt(i.detail, "", 1000),
          kcal: num(i.kcal, 0, 0, 20000),
          prot: num(i.prot, 0, 0, 2000),
          done: bool(i.done),
        }))
        .sort((a, b) => a.t.localeCompare(b.t))
    : d.items;
  // Rotina vazia é sinal de arquivo estragado — devolve a rotina padrão em vez de
  // deixar o usuário olhando pra um dia em branco.
  if (!e.items.length) e.items = d.items;

  // ── histórico
  const h = Array.isArray(bruto.history) ? bruto.history : [];
  const porData = new Map();
  for (const x of h) {
    if (!x || !dataOuNulo(x.date)) continue;
    porData.set(x.date, {
      date: x.date,
      vit: num(x.vit, 0, 0, 3),
      blocks: num(x.blocks, 0, 0),
      kcal: num(x.kcal, 0, 0),
      prot: num(x.prot, 0, 0),
      energy: x.energy == null ? null : num(x.energy, null, 1, 10),
      water: num(x.water, 0, 0, 12),
      sleep: SONO_VALIDOS.includes(x.sleep) ? x.sleep : null,
      grat: txt(x.grat, "", 500),
      // Guardar o TEXTO das vitórias do dia. Antes só sobrava a contagem, e o que
      // a pessoa escreveu ("fechei a proposta da Red") sumia na virada da meia-noite.
      vitorias: Array.isArray(x.vitorias)
        ? x.vitorias.slice(0, 3).map((v) => ({
            id: txt(v?.id, "", 20),
            label: txt(v?.label, "", 40),
            text: txt(v?.text, "", 300),
            done: bool(v?.done),
          }))
        : [],
      closed: bool(x.closed, num(x.vit, 0) === 3),
    });
  }
  e.history = [...porData.values()].sort((a, b) => a.date.localeCompare(b.date));

  // ── treino (anamnese + plano). Guardado como veio, com limites de segurança:
  // é dado da própria pessoa, e o formato do plano pode evoluir.
  if (bruto.treino && typeof bruto.treino === "object") {
    const t = bruto.treino;
    // cargas: { exId: kg } — só números válidos
    const cargas = {};
    if (t.cargas && typeof t.cargas === "object") {
      for (const [k, v] of Object.entries(t.cargas)) {
        const kg = num(v, null, 0, 1000);
        if (kg != null) cargas[String(k).slice(0, 40)] = kg;
      }
    }
    const feito = t.feito && typeof t.feito === "object"
      ? { data: dataOuNulo(t.feito.data) || "", ids: Array.isArray(t.feito.ids) ? t.feito.ids.slice(0, 60).map((x) => String(x).slice(0, 40)) : [] }
      : { data: "", ids: [] };
    e.treino = {
      anamnese: t.anamnese && typeof t.anamnese === "object" ? t.anamnese : null,
      plano: t.plano && typeof t.plano === "object" ? t.plano : null,
      dieta: t.dieta && typeof t.dieta === "object" ? t.dieta : null,
      cargas,
      feito,
    };
  }

  // ── totais vitalícios
  const lt = bruto.lifetime;
  if (lt && typeof lt === "object" && Number.isFinite(+lt.dias)) {
    e.lifetime = {
      dias: num(lt.dias, 0, 0),
      vitorias: num(lt.vitorias, 0, 0),
      blocos: num(lt.blocos, 0, 0),
      kcal: num(lt.kcal, 0, 0),
      prot: num(lt.prot, 0, 0),
    };
  } else {
    // Quem vem da versão antiga não tem esses totais: reconstrói do histórico que sobrou.
    e.lifetime = e.history.reduce(
      (a, x) => ({
        dias: a.dias + (ativo(x) ? 1 : 0),
        vitorias: a.vitorias + x.vit,
        blocos: a.blocos + x.blocks,
        kcal: a.kcal + x.kcal,
        prot: a.prot + x.prot,
      }),
      { dias: 0, vitorias: 0, blocos: 0, kcal: 0, prot: 0 }
    );
  }

  // Os totais nunca podem ser menores que o histórico que ainda está guardado.
  const doHistorico = e.history.reduce(
    (a, x) => ({
      dias: a.dias + (ativo(x) ? 1 : 0),
      vitorias: a.vitorias + x.vit,
      blocos: a.blocos + x.blocks,
      kcal: a.kcal + x.kcal,
      prot: a.prot + x.prot,
    }),
    { dias: 0, vitorias: 0, blocos: 0, kcal: 0, prot: 0 }
  );
  for (const k of Object.keys(doHistorico)) {
    e.lifetime[k] = Math.max(e.lifetime[k], doHistorico[k]);
  }

  return e;
}

// ─── Fotografia do dia ───────────────────────────────────────────────────────
export function fotografar(x) {
  const refeicoes = x.items.filter((i) => i.kind === "meal");
  const vit = x.vitorias.filter((v) => v.done).length;
  return {
    date: x.currentDate,
    vit,
    blocks: x.items.filter((i) => i.kind === "block" && i.done).length,
    kcal: refeicoes.filter((m) => m.done).reduce((a, m) => a + (+m.kcal || 0), 0),
    prot: refeicoes.filter((m) => m.done).reduce((a, m) => a + (+m.prot || 0), 0),
    energy: x.energy,
    water: x.water || 0,
    sleep: x.sleep || null,
    grat: x.gratitude || "",
    vitorias: x.vitorias.map((v) => ({ id: v.id, label: v.label, text: v.text, done: v.done })),
    closed: vit === 3,
  };
}

export const ativo = (s) => !!s && (s.vit > 0 || s.kcal > 0 || s.blocks > 0 || s.energy != null);

/**
 * Arquiva o dia corrente no histórico e soma nos totais vitalícios.
 *
 * Soma por DIFERENÇA em relação ao que já estava guardado naquela data. É isso
 * que impede o botão "encerrar o dia", apertado duas vezes no mesmo dia, de
 * contar o dia (e as vitórias) em dobro.
 */
export function arquivar(x) {
  const foto = fotografar(x);
  if (!ativo(foto)) return { history: x.history || [], lifetime: x.lifetime };

  const anterior = (x.history || []).find((h) => h.date === foto.date);
  const lifetime = { ...x.lifetime };

  lifetime.dias += anterior ? 0 : 1; // um dia só conta uma vez
  lifetime.vitorias += foto.vit - (anterior?.vit || 0);
  lifetime.blocos += foto.blocks - (anterior?.blocks || 0);
  lifetime.kcal += foto.kcal - (anterior?.kcal || 0);
  lifetime.prot += foto.prot - (anterior?.prot || 0);

  for (const k of Object.keys(lifetime)) lifetime[k] = Math.max(0, lifetime[k]);

  const history = [...(x.history || []).filter((h) => h.date !== foto.date), foto]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-TETO_HISTORICO);

  return { history, lifetime };
}

/**
 * Virada de dia. Arquiva o que passou e abre o dia de hoje limpo.
 * Devolve o mesmo objeto quando ainda é o mesmo dia (então é barato chamar sempre).
 */
export function virarODia(x) {
  if (!x || x.currentDate === iso()) return x;

  const { history, lifetime } = arquivar(x);
  return {
    ...x,
    currentDate: iso(),
    history,
    lifetime,
    energy: null,
    water: 0,
    sleep: null,
    gratitude: "",
    tipIndex: (x.tipIndex + 1) % TIPS.length,
    vitorias: x.vitorias.map((v) => ({ ...v, text: "", done: false })),
    items: x.items.map((i) => ({ ...i, done: false })),
    atualizadoEm: Date.now(),
  };
}

// ─── Fusão entre aparelhos ───────────────────────────────────────────────────
/**
 * Junta o estado do celular com o do servidor sem perder nada de ninguém.
 *
 * A regra: o mais recente manda no que é "estado de agora" (a rotina, o dia
 * aberto, o texto do objetivo). Já o que só cresce — XP, sequência recorde,
 * páginas lidas, histórico, pesagens — é somado ou fica com o maior valor.
 * Assim, marcar uma vitória no celular nunca apaga a que foi marcada no notebook.
 */
export function fundir(a, b) {
  if (!a) return b;
  if (!b) return a;

  const recente = (a.atualizadoEm || 0) >= (b.atualizadoEm || 0) ? a : b;
  const antigo = recente === a ? b : a;

  // ── histórico: união por data
  const porData = new Map();
  for (const h of antigo.history || []) porData.set(h.date, h);
  for (const h of recente.history || []) porData.set(h.date, h); // o mais recente ganha o empate

  // Se o lado ANTIGO está num dia diferente, o dia dele ainda não foi arquivado.
  // Arquiva a foto dele aqui, senão o texto das vitórias e a gratidão daquele dia
  // sumiriam na fusão (a fusão fica com o dia do lado recente).
  if (antigo.currentDate !== recente.currentDate) {
    const foto = fotografar(antigo);
    if (ativo(foto) && !porData.has(foto.date)) porData.set(foto.date, foto);
  }
  const history = [...porData.values()].sort((x, y) => x.date.localeCompare(y.date)).slice(-TETO_HISTORICO);

  // ── dia corrente: se OS DOIS estão no mesmo dia, junta as marcações.
  // É isto que torna verdadeira a promessa "marcar uma vitória no celular nunca
  // apaga a que foi marcada no notebook": antes, o lado recente levava o dia
  // inteiro e apagava o que o outro tinha feito.
  let { vitorias, items, water, energy, sleep, gratitude } = recente;
  if (antigo.currentDate === recente.currentDate) {
    vitorias = recente.vitorias.map((v) => {
      const o = (antigo.vitorias || []).find((x) => x.id === v.id);
      return o ? { ...v, done: v.done || o.done, text: v.text || o.text } : v;
    });
    const feitoAntigo = new Map((antigo.items || []).map((i) => [i.id, i.done]));
    items = recente.items.map((i) => (feitoAntigo.get(i.id) ? { ...i, done: true } : i));
    water = Math.max(recente.water || 0, antigo.water || 0);
    energy = recente.energy ?? antigo.energy;
    sleep = recente.sleep || antigo.sleep;
    gratitude = recente.gratitude || antigo.gratitude;
  }

  // ── peso: união por data
  const pesos = new Map();
  for (const p of antigo.weight?.log || []) pesos.set(p.date, p);
  for (const p of recente.weight?.log || []) pesos.set(p.date, p);
  const log = [...pesos.values()].sort((x, y) => x.date.localeCompare(y.date));

  const maior = (campo) => Math.max(a[campo] || 0, b[campo] || 0);

  return normalizar({
    ...recente,
    vitorias,
    items,
    water,
    energy,
    sleep,
    gratitude,

    // Contadores que só sobem. max() é conservador: nunca APAGA progresso, mas
    // pode subcontar dois ganhos offline simultâneos (raro em uso pessoal, e o
    // erro é a favor de não inflar XP num reenvio).
    xp: maior("xp"),
    streakRecord: maior("streakRecord"),
    barriersWon: maior("barriersWon"),

    history,
    weight: { ...recente.weight, log },

    lifetime: {
      dias: Math.max(a.lifetime?.dias || 0, b.lifetime?.dias || 0),
      vitorias: Math.max(a.lifetime?.vitorias || 0, b.lifetime?.vitorias || 0),
      blocos: Math.max(a.lifetime?.blocos || 0, b.lifetime?.blocos || 0),
      kcal: Math.max(a.lifetime?.kcal || 0, b.lifetime?.kcal || 0),
      prot: Math.max(a.lifetime?.prot || 0, b.lifetime?.prot || 0),
    },

    reading: {
      ...recente.reading,
      finished: Math.max(a.reading?.finished || 0, b.reading?.finished || 0),
      pagesAllTime: Math.max(a.reading?.pagesAllTime || 0, b.reading?.pagesAllTime || 0),
    },

    atualizadoEm: Math.max(a.atualizadoEm || 0, b.atualizadoEm || 0),
  });
}
