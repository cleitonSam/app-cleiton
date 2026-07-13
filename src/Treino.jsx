import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, conversarIA, semConexao } from "./api.js";
import { iso } from "./estado.js";
import {
  BadgeGrupo,
  IcAgua,
  IcAlvo,
  IcApito,
  IcChama,
  IcCheque,
  IcChevron,
  IcCorpo,
  IcEnviar,
  IcGrafico,
  IcHalter,
  IcInfo,
  IcMaca,
  IconeEquip,
  IconeRefeicao,
  IcPlay,
  IcRelogio,
  IcTroca,
} from "./Icones.jsx";

// ─── Aba Treino ───────────────────────────────────────────────────────────────
// Treino (plano + hoje + carga) · Dieta (macros + cardápio) · Personal (chat).
// Tudo puxando da biblioteca e da base de alimentos reais; nada inventado.

// vibração curta no toque (só onde o aparelho suporta) — dá o "tato" do premium
const buzz = (p = 10) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

const OBJETIVOS = [
  { v: "Ganho de massa", t: "Ganhar massa", d: "Engordar com músculo", ic: IcHalter, cor: "#1F5FE6" },
  { v: "Emagrecimento", t: "Emagrecer", d: "Perder gordura com saúde", ic: IcChama, cor: "#E85C8A" },
  { v: "Ganho de força", t: "Ganhar força", d: "Ficar mais forte", ic: IcAlvo, cor: "#C97824" },
  { v: "Saúde e bem-estar", t: "Saúde", d: "Manter o corpo em dia", ic: IcCorpo, cor: "#1FA36E" },
];
const NIVEIS = ["Iniciante", "Intermediário", "Avançado"];
const TEMPOS = ["30 min", "45 min", "60 min", "60+ min"];
const EQUIPAMENTOS = [
  { v: "academia", t: "Academia completa" },
  { v: "halteres", t: "Halteres em casa" },
  { v: "barra", t: "Barra / anilhas" },
  { v: "corpo", t: "Só peso do corpo" },
];
const PARQ = [
  "Algum médico já disse que você tem problema no coração?",
  "Sente dor no peito ao fazer esforço físico?",
  "Já teve tontura, desmaio ou perda de consciência?",
  "Tem problema no osso ou articulação que piora com exercício?",
  "Toma remédio para pressão ou coração?",
];

export default function Treino({ s, setS, iaAtiva }) {
  const treino = s.treino || {};
  const temPlano = !!treino.plano?.treinos?.length;
  const [vista, setVista] = useState(temPlano ? "plano" : "intro");
  const [exAberto, setExAberto] = useState(null);

  const pesoSalvo = s.weight?.log?.length ? s.weight.log[s.weight.log.length - 1].kg : "";

  // ── helpers de estado (carga + histórico + feito hoje) ──
  const cargas = treino.cargas || {};
  const cargasHist = treino.cargasHist || {};
  const feitoHoje = treino.feito?.data === iso() ? treino.feito.ids : [];

  // Registra a carga: guarda o valor atual E grava no histórico (uma entrada por
  // dia). É o histórico que deixa a pessoa VER o peso subir — o gancho de resultado.
  const registrarCarga = (exId, kg) =>
    setS((x) => {
      const t = x.treino || {};
      const hist = { ...(t.cargasHist || {}) };
      const semHoje = (hist[exId] || []).filter((e) => e.d !== iso());
      hist[exId] = [...semHoje, { d: iso(), kg }].slice(-20);
      return { ...x, treino: { ...t, cargas: { ...(t.cargas || {}), [exId]: kg }, cargasHist: hist } };
    });

  const toggleFeito = (exId) =>
    setS((x) => {
      const t = x.treino || {};
      const hoje = iso();
      const atual = t.feito?.data === hoje ? t.feito.ids : [];
      const ids = atual.includes(exId) ? atual.filter((i) => i !== exId) : [...atual, exId];
      return { ...x, treino: { ...t, feito: { data: hoje, ids } } };
    });

  const salvarPlano = (anamnese, plano) => setS((x) => ({ ...x, treino: { ...x.treino, anamnese, plano } }));
  const setDieta = (dieta) => setS((x) => ({ ...x, treino: { ...x.treino, dieta } }));

  return (
    <section className="tr">
      <style>{css}</style>

      <div className="trtabs">
        <button className={"trtab" + (["plano", "intro"].includes(vista) ? " on" : "")} onClick={() => { buzz(6); setVista(temPlano ? "plano" : "intro"); }}>
          <IcHalter size={18} /> Treino
        </button>
        <button className={"trtab" + (vista === "dieta" ? " on" : "")} onClick={() => { buzz(6); setVista("dieta"); }}>
          <IcMaca size={18} /> Dieta
        </button>
        <button className={"trtab" + (vista === "personal" ? " on" : "")} onClick={() => { buzz(6); setVista("personal"); }}>
          <IcApito size={18} /> Personal
        </button>
      </div>

      {/* key={vista}: cada troca de sub-aba entra com um fade suave (fim do "pisca") */}
      <div key={vista} className="trvista">
        {vista === "intro" && <Intro onComecar={() => setVista("anamnese")} />}

        {vista === "anamnese" && (
          <Anamnese
            inicial={treino.anamnese}
            pesoSalvo={pesoSalvo}
            onCancelar={() => setVista(temPlano ? "plano" : "intro")}
            onPronto={(anamnese, plano) => {
              salvarPlano(anamnese, plano);
              setVista("plano");
            }}
          />
        )}

        {vista === "plano" && temPlano && (
          <Plano
            plano={treino.plano}
            anamnese={treino.anamnese}
            cargas={cargas}
            cargasHist={cargasHist}
            feitoHoje={feitoHoje}
            onCarga={registrarCarga}
            onToggleFeito={toggleFeito}
            onRefazer={() => setVista("anamnese")}
            onAbrirEx={setExAberto}
          />
        )}
        {vista === "plano" && !temPlano && <Intro onComecar={() => setVista("anamnese")} />}

        {vista === "dieta" && <Dieta anamnese={treino.anamnese} dieta={treino.dieta} onDieta={setDieta} iaAtiva={iaAtiva} temAnamnese={!!treino.anamnese} onFazerAnamnese={() => setVista("anamnese")} />}

        {vista === "personal" && <Chat agente="personal" anamnese={treino.anamnese} plano={treino.plano} iaAtiva={iaAtiva} />}
      </div>

      {exAberto && (
        <ExercicioModal
          item={exAberto}
          carga={cargas[exAberto.id]}
          hist={cargasHist[exAberto.id]}
          onCarga={(kg) => registrarCarga(exAberto.id, kg)}
          feito={feitoHoje.includes(exAberto.id)}
          onToggleFeito={() => toggleFeito(exAberto.id)}
          onFechar={() => setExAberto(null)}
        />
      )}
    </section>
  );
}

// ─── Intro ────────────────────────────────────────────────────────────────────
function Intro({ onComecar }) {
  return (
    <div className="trintro">
      <div className="trintroic"><IcHalter size={40} /></div>
      <h2 className="trintroh">Seu treino, do seu jeito</h2>
      <p className="trintrop">
        Responde umas perguntas rápidas e eu monto um plano com exercícios de verdade — cada um com
        vídeo mostrando a execução. Depois, o personal e o nutricionista te ajudam a ajustar tudo.
      </p>
      <ul className="trintrolista">
        <li><IcCheque size={16} /> Plano montado pelo seu objetivo e frequência</li>
        <li><IcPlay size={16} /> Vídeo de cada exercício</li>
        <li><IcMaca size={16} /> Dieta com suas calorias e comida de verdade</li>
        <li><IcApito size={16} /> Personal e nutricionista de IA</li>
      </ul>
      <button className="trbtn grande" onClick={onComecar}>Montar meu treino</button>
    </div>
  );
}

// ─── Anamnese (multi-step) ────────────────────────────────────────────────────
function Anamnese({ inicial, pesoSalvo, onPronto, onCancelar }) {
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [a, setA] = useState(() => ({
    objetivo: inicial?.objetivo || "",
    nivel: inicial?.nivel || "Iniciante",
    frequencia: inicial?.frequencia || 3,
    tempo: inicial?.tempo || "60 min",
    equipamentos: inicial?.equipamentos?.length ? inicial.equipamentos : ["academia"],
    peso: inicial?.peso || pesoSalvo || "",
    altura: inicial?.altura || "",
    idade: inicial?.idade || "",
    sexo: inicial?.sexo || "Masculino",
    parqSim: inicial?.parqSim || false,
    lesoes: inicial?.lesoes || "",
    restricoesAlimentares: inicial?.restricoesAlimentares || "",
  }));
  const [parq, setParq] = useState(() => PARQ.map(() => false));
  const set = (p) => setA((x) => ({ ...x, ...p }));

  const toggleEquip = (v) =>
    setA((x) => {
      const tem = x.equipamentos.includes(v);
      const eq = tem ? x.equipamentos.filter((e) => e !== v) : [...x.equipamentos, v];
      return { ...x, equipamentos: eq.length ? eq : ["corpo"] };
    });

  const finalizar = async () => {
    setErro(null);
    setGerando(true);
    const anamnese = {
      ...a,
      peso: Number(String(a.peso).replace(",", ".")) || null,
      altura: Number(a.altura) || null,
      idade: Number(a.idade) || null,
      parqSim: parq.some(Boolean),
    };
    try {
      const { plano } = await api.treinoGerar(anamnese);
      plano.geradoEm = Date.now();
      onPronto(anamnese, plano);
    } catch (e) {
      setErro(semConexao(e) ? "Sem internet. Tenta de novo." : e.message);
      setGerando(false);
    }
  };

  const passos = [
    {
      titulo: "Qual é o seu objetivo?",
      valido: !!a.objetivo,
      conteudo: (
        <div className="trescolhas">
          {OBJETIVOS.map((o) => {
            const Ic = o.ic;
            return (
              <button key={o.v} className={"trescolha" + (a.objetivo === o.v ? " on" : "")} onClick={() => set({ objetivo: o.v })}>
                <span className="trescolhaic" style={{ background: o.cor }}><Ic size={22} /></span>
                <span className="trescolhat">{o.t}</span>
                <span className="trescolhad">{o.d}</span>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      titulo: "Como é a sua rotina de treino?",
      valido: true,
      conteudo: (
        <>
          <label className="trlabel">Seu nível</label>
          <div className="trseg">{NIVEIS.map((n) => <button key={n} className={"trsegb" + (a.nivel === n ? " on" : "")} onClick={() => set({ nivel: n })}>{n}</button>)}</div>
          <label className="trlabel">Quantos dias por semana?</label>
          <div className="trfreq">{[1, 2, 3, 4, 5, 6].map((f) => <button key={f} className={"trfreqb" + (a.frequencia === f ? " on" : "")} onClick={() => set({ frequencia: f })}>{f}x</button>)}</div>
          <label className="trlabel">Tempo por treino</label>
          <div className="trseg">{TEMPOS.map((t) => <button key={t} className={"trsegb" + (a.tempo === t ? " on" : "")} onClick={() => set({ tempo: t })}>{t}</button>)}</div>
        </>
      ),
    },
    {
      titulo: "Onde você treina?",
      valido: a.equipamentos.length > 0,
      conteudo: (
        <>
          <p className="trnota">Pode marcar mais de um. Eu só escolho exercícios que dá pra fazer com o que você tem.</p>
          <div className="trmulti">
            {EQUIPAMENTOS.map((e) => (
              <button key={e.v} className={"trmultib" + (a.equipamentos.includes(e.v) ? " on" : "")} onClick={() => toggleEquip(e.v)}>
                <span className="trcheck">{a.equipamentos.includes(e.v) ? <IcCheque size={14} /> : null}</span>
                {e.t}
              </button>
            ))}
          </div>
        </>
      ),
    },
    {
      titulo: "Sobre o seu corpo",
      valido: true,
      conteudo: (
        <>
          <p className="trnota">É pra calcular suas calorias e proteína certinho. Pode pular se preferir.</p>
          <div className="trgrid2">
            <div><label className="trlabel">Peso (kg)</label><input className="trinput" type="text" inputMode="decimal" value={a.peso} onChange={(e) => set({ peso: e.target.value })} placeholder="Ex.: 54,5" /></div>
            <div><label className="trlabel">Altura (cm)</label><input className="trinput" type="text" inputMode="numeric" value={a.altura} onChange={(e) => set({ altura: e.target.value })} placeholder="Ex.: 170" /></div>
            <div><label className="trlabel">Idade</label><input className="trinput" type="text" inputMode="numeric" value={a.idade} onChange={(e) => set({ idade: e.target.value })} placeholder="Ex.: 28" /></div>
            <div>
              <label className="trlabel">Sexo</label>
              <div className="trseg mini">{["Masculino", "Feminino"].map((sx) => <button key={sx} className={"trsegb" + (a.sexo === sx ? " on" : "")} onClick={() => set({ sexo: sx })}>{sx}</button>)}</div>
            </div>
          </div>
        </>
      ),
    },
    {
      titulo: "Uma checagem rápida de saúde",
      valido: true,
      conteudo: (
        <>
          <p className="trnota">Marque o que for verdade pra você. Isso me deixa mais cuidadoso na hora de montar o treino.</p>
          <div className="trparq">
            {PARQ.map((q, i) => (
              <button key={i} className={"trparqi" + (parq[i] ? " on" : "")} onClick={() => setParq((p) => p.map((v, j) => (j === i ? !v : v)))}>
                <span className="trcheck">{parq[i] ? <IcCheque size={14} /> : null}</span>
                <span>{q}</span>
              </button>
            ))}
          </div>
          <label className="trlabel">Alguma lesão ou limitação?</label>
          <input className="trinput" value={a.lesoes} onChange={(e) => set({ lesoes: e.target.value })} placeholder="Ex.: dor no ombro direito (ou deixa em branco)" />
          <label className="trlabel">Restrição alimentar? (pro nutricionista)</label>
          <input className="trinput" value={a.restricoesAlimentares} onChange={(e) => set({ restricoesAlimentares: e.target.value })} placeholder="Ex.: sem lactose, vegetariano…" />
          {parq.some(Boolean) && (
            <p className="travisosaude"><IcInfo size={16} /> Como você marcou algo acima, vale conversar com um médico antes de treinos pesados. Vou montar um plano mais leve.</p>
          )}
        </>
      ),
    },
  ];

  const atual = passos[passo];
  const ultimo = passo === passos.length - 1;

  return (
    <div className="tranam">
      <div className="tranamtopo">
        <div className="tranamdots">{passos.map((_, i) => <span key={i} className={"tranamdot" + (i === passo ? " on" : i < passo ? " feito" : "")} />)}</div>
        <button className="trlink" onClick={onCancelar}>Cancelar</button>
      </div>
      <h2 className="tranamh">{atual.titulo}</h2>
      <div className="tranamcont">{atual.conteudo}</div>
      {erro && <p className="trerro">{erro}</p>}
      <div className="tranambtns">
        {passo > 0 && <button className="trbtn ghost" onClick={() => setPasso((p) => p - 1)} disabled={gerando}>Voltar</button>}
        {!ultimo ? (
          <button className="trbtn" disabled={!atual.valido} onClick={() => setPasso((p) => p + 1)}>Continuar</button>
        ) : (
          <button className="trbtn" disabled={gerando} onClick={finalizar}>{gerando ? "Montando…" : "Montar meu treino"}</button>
        )}
      </div>
    </div>
  );
}

// ─── Input de carga com histórico (flash + recorde) ───────────────────────────
function CargaInput({ carga, hist, onRegistrar, nome }) {
  const [draft, setDraft] = useState(carga != null ? String(carga) : "");
  const [flash, setFlash] = useState(null); // null | 'ok' | 'recorde'
  useEffect(() => { setDraft(carga != null ? String(carga) : ""); }, [carga]);

  // recorde = maior carga registrada ANTES de hoje
  const recordeAnterior = (hist || []).filter((e) => e.d !== iso()).reduce((m, e) => Math.max(m, e.kg), 0);

  const commit = () => {
    const kg = Number(String(draft).replace(",", "."));
    if (!Number.isFinite(kg) || kg <= 0) return;
    if (kg === carga && (hist || []).some((e) => e.d === iso() && e.kg === kg)) return; // nada mudou
    onRegistrar(kg);
    const recorde = recordeAnterior > 0 && kg > recordeAnterior;
    setFlash(recorde ? "recorde" : "ok");
    buzz(recorde ? [12, 40, 12] : 8);
    setTimeout(() => setFlash(null), 1600);
  };

  return (
    <div className="trcarga">
      <input
        className={"trcargain" + (flash ? " f-" + flash : "")}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { commit(); e.target.blur(); } }}
        placeholder={recordeAnterior ? String(recordeAnterior) : "kg"}
        aria-label={"Carga de " + nome}
      />
      {flash === "recorde" && <span className="trrecorde">recorde! 🎉</span>}
    </div>
  );
}

// variante do CargaInput pro modal (grava no histórico ao sair do campo)
function CargaModalInput({ carga, hist, onRegistrar, nome }) {
  const [draft, setDraft] = useState(carga != null ? String(carga) : "");
  const [flash, setFlash] = useState(false);
  useEffect(() => { setDraft(carga != null ? String(carga) : ""); }, [carga]);
  const recordeAnterior = (hist || []).filter((e) => e.d !== iso()).reduce((m, e) => Math.max(m, e.kg), 0);
  const commit = () => {
    const kg = Number(String(draft).replace(",", "."));
    if (!Number.isFinite(kg) || kg <= 0) return;
    onRegistrar(kg);
    buzz(recordeAnterior > 0 && kg > recordeAnterior ? [12, 40, 12] : 8);
    setFlash(true);
    setTimeout(() => setFlash(false), 1400);
  };
  return (
    <input
      className={flash ? "f-ok" : ""}
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") { commit(); e.target.blur(); } }}
      placeholder={recordeAnterior ? String(recordeAnterior) : "0"}
      aria-label={"Carga de " + nome}
    />
  );
}

// mini-evolução da carga (últimos registros como barras) — pro modal
function MiniEvolucao({ hist }) {
  const dados = (hist || []).slice(-8);
  if (dados.length < 2) return null;
  const max = Math.max(...dados.map((e) => e.kg));
  const min = Math.min(...dados.map((e) => e.kg));
  const span = max - min || 1;
  const primeiro = dados[0].kg;
  const ultimo = dados[dados.length - 1].kg;
  const delta = +(ultimo - primeiro).toFixed(1);
  return (
    <div className="trbloco">
      <h4 className="trblocoh"><IcGrafico size={15} /> Sua evolução de carga</h4>
      <div className="trevobarras">
        {dados.map((e, i) => (
          <div key={i} className="trevocol" title={`${e.d}: ${e.kg}kg`}>
            <div className="trevobar" style={{ height: 20 + ((e.kg - min) / span) * 44 + "px" }} />
          </div>
        ))}
      </div>
      <p className="trevotxt">
        {delta > 0 ? <><strong style={{ color: "var(--vd)" }}>+{delta} kg</strong> desde o começo. Tá subindo! 💪</> : delta < 0 ? `${delta} kg no período.` : "Mantendo a carga. Bora aumentar?"}
        {" "}Recorde: <strong>{max} kg</strong>.
      </p>
    </div>
  );
}

// ─── Plano ────────────────────────────────────────────────────────────────────
function Plano({ plano, anamnese, cargas, cargasHist, feitoHoje, onCarga, onToggleFeito, onRefazer, onAbrirEx }) {
  const [aberto, setAberto] = useState(0);
  const nut = calcNutri(anamnese);

  // progresso do dia (todos os exercícios do plano marcados hoje)
  const todosEx = plano.treinos.flatMap((t) => t.exercicios);
  const feitosTotal = todosEx.filter((e) => feitoHoje.includes(e.id)).length;

  // detecta quando um bloco A/B/C acabou de fechar, pra vibrar (a celebração
  // visual aparece via CSS/JSX). Guarda o estado anterior de cada treino.
  const antesRef = useRef({});
  useEffect(() => {
    plano.treinos.forEach((t) => {
      const completo = t.exercicios.length > 0 && t.exercicios.every((e) => feitoHoje.includes(e.id));
      if (completo && !antesRef.current[t.nome]) buzz([16, 60, 24]); // fechou agora
      antesRef.current[t.nome] = completo;
    });
  }, [feitoHoje, plano]);

  const marcar = (exId) => { buzz(10); onToggleFeito(exId); };

  return (
    <div className="trplano">
      <div className="trplanotopo">
        <div>
          <span className="trplanoeye">Seu plano</span>
          <h2 className="trplanoh">{plano.divisao}</h2>
          <p className="trplanosub">{plano.frequencia}x/semana · {plano.objetivo} · nível {plano.nivel}</p>
        </div>
        <button className="trlink" onClick={onRefazer}>Refazer</button>
      </div>

      {nut && (
        <div className="trmetas">
          <div className="trmeta"><span className="trmetav">{nut.kcalMeta}</span><span className="trmetal">kcal/dia</span></div>
          <div className="trmeta"><span className="trmetav">{nut.macros.prot}g</span><span className="trmetal">proteína</span></div>
          <div className="trmeta"><span className="trmetav">{nut.macros.carb}g</span><span className="trmetal">carbo</span></div>
          <div className="trmeta"><span className="trmetav">{nut.macros.gord}g</span><span className="trmetal">gordura</span></div>
        </div>
      )}

      <div className="trprescricao">
        <IcRelogio size={16} /> {plano.prescricao.series} séries · {plano.prescricao.reps} reps · descanso {plano.prescricao.descanso}
      </div>

      {/* progresso agregado do dia — a barra cresce a cada exercício marcado */}
      {feitosTotal > 0 && (
        <div className="trprogwrap">
          <div className="trprog"><div className="trprogfill" style={{ width: (feitosTotal / (todosEx.length || 1)) * 100 + "%" }} /></div>
          <span className="trprogtxt">{feitosTotal} de {todosEx.length} exercícios feitos hoje</span>
        </div>
      )}

      <div className="trtreinos">
        {plano.treinos.map((t, i) => {
          const on = aberto === i;
          const feitos = t.exercicios.filter((e) => feitoHoje.includes(e.id)).length;
          const completo = feitos === t.exercicios.length;
          return (
            <div key={t.nome} className={"trtreino" + (on ? " on" : "") + (completo ? " done" : "")}>
              <button className="trtreinohead" onClick={() => { buzz(6); setAberto(on ? -1 : i); }}>
                <span className="trtreinoletra">{completo ? <IcCheque size={22} /> : t.nome.replace("Treino ", "")}</span>
                <span className="trtreinoinfo">
                  <strong>{t.nome}</strong>
                  <span>{t.foco} · {feitos}/{t.exercicios.length} feitos hoje</span>
                </span>
                <span className={"trchev" + (on ? " ab" : "")}><IcChevron size={18} /></span>
              </button>
              {completo && <div className="trcelebra">🔥 {t.nome} fechado! {t.exercicios.length} exercícios. Bora pro próximo.</div>}
              {on && (
                <div className="trexlista">
                  {t.exercicios.map((ex) => {
                    const feito = feitoHoje.includes(ex.id);
                    return (
                      <div key={ex.id} className={"trex" + (feito ? " feito" : "")}>
                        <button className={"trexcheck" + (feito ? " on" : "")} onClick={() => marcar(ex.id)} aria-label={feito ? "Desmarcar" : "Marcar como feito"}>
                          {feito ? <IcCheque size={16} /> : null}
                        </button>
                        <button className="trexcorpo" onClick={() => onAbrirEx(ex)}>
                          <BadgeGrupo grupo={ex.grupo} size={38} />
                          <span className="trexinfo">
                            <span className="trexnome">{ex.nome}</span>
                            <span className="trexmeta"><IconeEquip equip={ex.equip} size={13} /> {ex.series} × {ex.reps} · {ex.grupo}</span>
                          </span>
                          <span className="trexplay"><IcPlay size={20} /></span>
                        </button>
                        <CargaInput carga={cargas[ex.id]} hist={cargasHist[ex.id]} onRegistrar={(kg) => onCarga(ex.id, kg)} nome={ex.nome} />
                      </div>
                    );
                  })}
                  {plano.prescricao.cardio && <p className="trcardio"><IcChama size={15} /> Cardio: {plano.prescricao.cardio}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="trdica"><IcInfo size={14} /> Toque no exercício pra ver o vídeo. Marque ✓ quando fizer e anote a carga (kg) pra acompanhar sua evolução.</p>
    </div>
  );
}

// ─── Dieta ────────────────────────────────────────────────────────────────────
function Dieta({ anamnese, dieta, onDieta, iaAtiva, temAnamnese, onFazerAnamnese }) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);
  const [ajuste, setAjuste] = useState("");
  const [buscando, setBuscando] = useState("");
  const [achados, setAchados] = useState([]);
  const nut = calcNutri(anamnese);

  const gerar = async (pedido) => {
    setErro(null);
    setGerando(true);
    try {
      const { dieta: nova } = await api.iaDieta(anamnese, pedido);
      onDieta(nova);
      setAjuste("");
    } catch (e) {
      setErro(semConexao(e) ? "Sem internet." : e.message);
    } finally {
      setGerando(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      if (buscando.trim().length < 2) return setAchados([]);
      try {
        const { alimentos } = await api.nutriAlimentos(buscando.trim());
        setAchados(alimentos.slice(0, 12));
      } catch {
        setAchados([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [buscando]);

  if (!temAnamnese) {
    return (
      <div className="trintro">
        <div className="trintroic" style={{ background: "linear-gradient(135deg,#1FA36E,#3FD0A6)" }}><IcMaca size={40} /></div>
        <h2 className="trintroh">Sua dieta começa aqui</h2>
        <p className="trintrop">Preciso saber seu objetivo, peso e altura pra calcular suas calorias. Leva um minuto.</p>
        <button className="trbtn grande" onClick={onFazerAnamnese}>Responder e calcular</button>
      </div>
    );
  }

  return (
    <div className="trdieta">
      {/* painel de macros */}
      {nut && (
        <div className="trmacrocard">
          <div className="trmacrotopo">
            <div>
              <span className="trmacroeye"><IcGrafico size={13} /> Suas metas do dia</span>
              <div className="trmacrokcal">{nut.kcalMeta} <span>kcal</span></div>
              <span className="trmacroref">{nut.referencia}</span>
            </div>
            <div className="trmacroanel"><AnelMacro macros={nut.macros} /></div>
          </div>
          <div className="trmacrobars">
            {(() => {
              // barras proporcionais à fatia de calorias de cada macro (não mais 100% fixo)
              const kP = nut.macros.prot * 4, kC = nut.macros.carb * 4, kG = nut.macros.gord * 9;
              const tot = kP + kC + kG || 1;
              return (
                <>
                  <BarraMacro nome="Proteína" v={nut.macros.prot} pct={Math.round((kP / tot) * 100)} cor="#1F5FE6" />
                  <BarraMacro nome="Carbo" v={nut.macros.carb} pct={Math.round((kC / tot) * 100)} cor="#0FB5C7" />
                  <BarraMacro nome="Gordura" v={nut.macros.gord} pct={Math.round((kG / tot) * 100)} cor="#E8A24E" />
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* cardápio */}
      {gerando && !dieta ? (
        <div className="trcardapskel">
          <p className="trskeltxt"><IcMaca size={16} /> Montando seu cardápio nas suas calorias…</p>
          {[0, 1, 2, 3].map((i) => <div key={i} className="trrefskel" />)}
        </div>
      ) : !dieta ? (
        <div className="trdietavazio">
          <p>Quer que eu monte seu cardápio do dia, com comida de verdade e nas suas calorias?</p>
          <button className="trbtn grande" disabled={gerando || !iaAtiva} onClick={() => gerar()}>
            {gerando ? "Montando seu cardápio…" : "Montar meu cardápio"}
          </button>
          {!iaAtiva && <p className="trnota" style={{ marginTop: 10 }}>A IA precisa estar ligada no servidor pra montar o cardápio.</p>}
        </div>
      ) : (
        <>
          <div className="trcardaptopo">
            <h3 className="trcardaph">Seu cardápio</h3>
            <button className="trlink" disabled={gerando} onClick={() => gerar()}>Refazer</button>
          </div>
          {dieta.resumo && <p className="trcardapresumo">{dieta.resumo}</p>}
          {dieta.totais && (
            <div className="trcardaptotais">
              <span>{Math.round(dieta.totais.kcal)} kcal</span>
              <span>P {Math.round(dieta.totais.prot)}g</span>
              <span>C {Math.round(dieta.totais.carb)}g</span>
              <span>G {Math.round(dieta.totais.gord)}g</span>
            </div>
          )}
          <div className="trrefeicoes">
            {(dieta.refeicoes || []).map((r, i) => (
              <div key={i} className="trrefeicao">
                <div className="trrefhead">
                  <span className="trrefic"><IconeRefeicao nome={r.nome} size={19} /></span>
                  <div className="trrefinfo"><strong>{r.nome}</strong>{r.horario && <span>{r.horario}</span>}</div>
                  {r.kcal ? <span className="trrefkcal">{Math.round(r.kcal)} kcal</span> : null}
                </div>
                <ul className="trreflista">
                  {(r.itens || []).map((it, j) => (
                    <li key={j}>
                      <span className="trrefalim">{it.alimento}{it.medida ? <em> · {it.medida}</em> : null}</span>
                      {it.kcal ? <span className="trrefmac">{Math.round(it.kcal)}kcal</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="trajuste">
            <input className="trcampo" value={ajuste} onChange={(e) => setAjuste(e.target.value)} placeholder="Ajustar (ex.: mais barato, sem lactose)" />
            <button className="trmandar" disabled={gerando || !ajuste.trim()} onClick={() => gerar(ajuste)} aria-label="Ajustar cardápio"><IcTroca size={20} /></button>
          </div>
        </>
      )}

      {erro && <p className="trerro">{erro}</p>}

      {/* busca de alimentos */}
      <div className="trbusca">
        <label className="trlabel">Consultar um alimento</label>
        <input className="trinput" value={buscando} onChange={(e) => setBuscando(e.target.value)} placeholder="Ex.: arroz, frango, banana…" />
        {achados.length > 0 && (
          <div className="tralimentos">
            {achados.map((a, i) => (
              <div key={i} className="tralimento">
                <span className="tralimnome">{a.nome}</span>
                <span className="tralimmac">{a.kcal ?? "—"}kcal · P{a.prot ?? "—"} C{a.carb ?? "—"} G{a.gord ?? "—"} <em>/100g</em></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* falar com o nutri */}
      {iaAtiva && (
        <details className="trperguntar">
          <summary><IcMaca size={16} /> Perguntar ao nutricionista</summary>
          <Chat agente="nutri" anamnese={anamnese} compacto />
        </details>
      )}
    </div>
  );
}

function AnelMacro({ macros }) {
  const kProt = macros.prot * 4, kCarb = macros.carb * 4, kGord = macros.gord * 9;
  const tot = kProt + kCarb + kGord || 1;
  const c = 2 * Math.PI * 26;
  let acc = 0;
  const seg = (val, cor) => {
    const frac = val / tot;
    const el = <circle key={cor} cx="32" cy="32" r="26" fill="none" stroke={cor} strokeWidth="8" strokeDasharray={`${frac * c} ${c}`} strokeDashoffset={-acc * c} transform="rotate(-90 32 32)" strokeLinecap="butt" />;
    acc += frac;
    return el;
  };
  return (
    <svg viewBox="0 0 64 64" width="72" height="72" role="img" aria-label="divisão de macros">
      <circle cx="32" cy="32" r="26" fill="none" stroke="#E2ECFC" strokeWidth="8" />
      {seg(kProt, "#1F5FE6")}
      {seg(kCarb, "#0FB5C7")}
      {seg(kGord, "#E8A24E")}
    </svg>
  );
}

function BarraMacro({ nome, v, pct, cor }) {
  return (
    <div className="trbarmac">
      <div className="trbarmactop"><span>{nome}</span><span>{v}g · {pct}%</span></div>
      <div className="trbartrilho"><div className="trbarfill" style={{ width: Math.max(6, pct) + "%", background: cor }} /></div>
    </div>
  );
}

// ─── Modal do exercício (vídeo + execução + carga + feito) ────────────────────
function ExercicioModal({ item, carga, hist, onCarga, feito, onToggleFeito, onFechar }) {
  const [detalhe, setDetalhe] = useState(null);
  const [erro, setErro] = useState(null);
  const [vi, setVi] = useState(0);

  useEffect(() => {
    let vivo = true;
    const aoTecla = (e) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", aoTecla);
    api.treinoExercicio(item.id).then((d) => vivo && setDetalhe(d)).catch((e) => vivo && setErro(semConexao(e) ? "Sem internet." : e.message));
    return () => {
      vivo = false;
      document.removeEventListener("keydown", aoTecla);
    };
  }, [item.id, onFechar]);

  // Trava o fundo enquanto a folha está aberta (senão o treino rola por trás no iPhone).
  useEffect(() => {
    const y = window.scrollY;
    const { style } = document.body;
    const antes = { position: style.position, top: style.top, width: style.width };
    style.position = "fixed";
    style.top = `-${y}px`;
    style.width = "100%";
    return () => {
      style.position = antes.position;
      style.top = antes.top;
      style.width = antes.width;
      window.scrollTo(0, y);
    };
  }, []);

  const passos = (detalhe?.passos || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const dicas = (detalhe?.dicas || "").split("\n").map((l) => l.trim()).filter(Boolean);

  // createPortal: renderiza a folha direto no <body>, FORA da seção do treino.
  // A seção tem um transform (da animação de entrada), e position:fixed dentro de
  // um ancestral com transform vira relativo a ele — era isso que "cortava a tela".
  return createPortal(
    <div className="trfundo" onClick={onFechar}>
      <div className="trfolha" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={item.nome}>
        <div className="trpuxador" />
        <div className="trexcab">
          <BadgeGrupo grupo={item.grupo} size={40} />
          <div>
            <h3 className="trexh">{item.nome}</h3>
            <p className="trexsub"><IconeEquip equip={item.equip} size={13} /> {item.series} × {item.reps} · descanso {item.descanso} · {item.grupo}</p>
          </div>
          <button className="trfechax" onClick={onFechar} aria-label="Fechar">×</button>
        </div>

        {erro && <p className="trerro">{erro}</p>}
        {!detalhe && !erro && <div className="trvidload">carregando vídeo…</div>}

        {detalhe?.videos?.length > 0 && (
          <div className="trvidwrap">
            <video key={vi} className="trvid" src={detalhe.videos[vi]} autoPlay loop muted playsInline controls={false} preload="auto" />
            {detalhe.videos.length > 1 && (
              <div className="trvidbtns">
                {detalhe.videos.map((_, i) => <button key={i} className={"trvidb" + (vi === i ? " on" : "")} onClick={() => setVi(i)}>{i === 0 ? "Frente" : "Lado"}</button>)}
              </div>
            )}
          </div>
        )}

        {/* carga do dia (grava no histórico ao sair do campo) */}
        <div className="trcargamodal">
          <span><IcHalter size={16} /> Carga de hoje</span>
          <div className="trcargamodalin">
            <CargaModalInput carga={carga} hist={hist} onRegistrar={onCarga} nome={item.nome} />
            <span>kg</span>
          </div>
        </div>

        <MiniEvolucao hist={hist} />

        {detalhe && (
          <>
            {passos.length > 0 && (
              <div className="trbloco">
                <h4 className="trblocoh">Como executar</h4>
                <ol className="trpassos">{passos.map((p, i) => <li key={i}>{p.replace(/^\d+[.)]\s*/, "")}</li>)}</ol>
              </div>
            )}
            {dicas.length > 0 && (
              <div className="trbloco">
                <h4 className="trblocoh">Dicas</h4>
                <ol className="trpassos">{dicas.map((p, i) => <li key={i}>{p.replace(/^\d+[.)]\s*/, "")}</li>)}</ol>
              </div>
            )}
            {detalhe.cuidados && (
              <div className="trbloco cuidado"><h4 className="trblocoh"><IcInfo size={15} /> Cuidados</h4><p className="trtexto">{detalhe.cuidados}</p></div>
            )}
            {detalhe.substituicoes && (
              <div className="trbloco"><h4 className="trblocoh"><IcTroca size={15} /> Dá pra trocar por</h4><p className="trtexto">{detalhe.substituicoes}</p></div>
            )}
          </>
        )}

        {/* barra de ação fixa no rodapé da folha: FEITO em destaque */}
        <div className="trmodalacoes">
          <button className={"trbtn feito" + (feito ? " on" : "")} onClick={() => { buzz(feito ? 8 : 18); onToggleFeito(); if (!feito) onFechar(); }}>
            {feito ? <><IcCheque size={18} /> Feito hoje</> : <><IcCheque size={18} /> Marcar como feito</>}
          </button>
          <button className="trbtn ghost" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Chat de IA (personal / nutri) ────────────────────────────────────────────
function Chat({ agente, anamnese, plano, iaAtiva, compacto }) {
  const ehNutri = agente === "nutri";
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef(null);
  const abortRef = useRef(null);

  const sugestoes = ehNutri
    ? ["Substitui o frango por outra coisa", "Lanche barato pra ganhar massa", "O que comer pós-treino?"]
    : ["Ajusta meu treino de hoje", "Como fazer agachamento certo?", "Tô sem tempo, encurta o treino"];

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const enviar = async (conteudo) => {
    const txt = (conteudo ?? texto).trim();
    if (!txt || enviando) return;
    setTexto("");
    const novas = [...msgs, { role: "user", content: txt }, { role: "assistant", content: "" }];
    setMsgs(novas);
    setEnviando(true);
    abortRef.current = new AbortController();
    try {
      await conversarIA(agente, {
        mensagens: novas.filter((m) => m.content || m.role === "user").slice(0, -1),
        anamnese,
        plano,
        sinal: abortRef.current.signal,
        onPedaco: (p) =>
          setMsgs((atual) => {
            const copia = [...atual];
            copia[copia.length - 1] = { role: "assistant", content: copia[copia.length - 1].content + p };
            return copia;
          }),
      });
    } catch (e) {
      if (e.name !== "AbortError") {
        setMsgs((atual) => {
          const copia = [...atual];
          copia[copia.length - 1] = { role: "assistant", content: (semConexao(e) ? "Sem internet agora." : e.message) || "Deu erro. Tenta de novo.", erro: true };
          return copia;
        });
      }
    } finally {
      setEnviando(false);
    }
  };

  if (!iaAtiva && !compacto) {
    return (
      <div className="trchatoff">
        <span className="trchatofic">{ehNutri ? <IcMaca size={34} /> : <IcApito size={34} />}</span>
        <p>O {ehNutri ? "nutricionista" : "personal"} de IA ainda não foi ligado neste servidor.</p>
        <p className="trnota">Peça pro administrador definir a chave <code>OPENROUTER_API_KEY</code>.</p>
      </div>
    );
  }

  return (
    <div className={"trchat" + (compacto ? " compacto" : "")}>
      {!compacto && (
        <div className="trchathead">
          <span className="trchatavatar" style={{ background: ehNutri ? "linear-gradient(135deg,#1FA36E,#3FD0A6)" : "linear-gradient(135deg,#1F5FE6,#0FB5C7)" }}>
            {ehNutri ? <IcMaca size={20} /> : <IcApito size={20} />}
          </span>
          <div>
            <strong>{ehNutri ? "Seu nutricionista" : "Seu personal"}</strong>
            <span>{ehNutri ? "monta sua dieta com comida de verdade" : "ajusta seu treino e ensina a execução"}</span>
          </div>
        </div>
      )}
      <div className="trmsgs">
        {msgs.length === 0 && (
          <div className="trvazio">
            <p>{ehNutri ? "Me pergunta sobre comida, calorias, dieta…" : "Me pergunta sobre treino, exercício, execução…"}</p>
            <div className="trsug">{sugestoes.map((sg) => <button key={sg} className="trsugb" onClick={() => enviar(sg)}>{sg}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={"trmsg " + m.role + (m.erro ? " erro" : "")}>
            {m.content ? <Markdownzinho texto={m.content} /> : <span className="trdigitando"><i /><i /><i /></span>}
          </div>
        ))}
        <div ref={fimRef} />
      </div>
      <form className="trentrada" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <input className="trcampo" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={ehNutri ? "Pergunta sobre dieta…" : "Pergunta sobre treino…"} enterKeyHint="send" disabled={enviando} />
        <button className="trmandar" type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar"><IcEnviar size={20} /></button>
      </form>
    </div>
  );
}

function Markdownzinho({ texto }) {
  const linhas = texto.split("\n");
  const out = [];
  let lista = [];
  const fechaLista = () => {
    if (lista.length) {
      out.push(<ul key={"u" + out.length}>{lista.map((l, i) => <li key={i}>{negrito(l)}</li>)}</ul>);
      lista = [];
    }
  };
  for (const l of linhas) {
    const t = l.trim();
    if (/^[-*•]\s+/.test(t)) { lista.push(t.replace(/^[-*•]\s+/, "")); continue; }
    fechaLista();
    if (!t) continue;
    if (/^#{1,4}\s/.test(t)) out.push(<h5 key={out.length}>{negrito(t.replace(/^#{1,4}\s/, ""))}</h5>);
    else if (/^\|.*\|$/.test(t)) out.push(<div key={out.length} className="trtabrow">{negrito(t.replace(/^\||\|$/g, "").replace(/\|/g, "   ·   "))}</div>);
    else out.push(<p key={out.length}>{negrito(t)}</p>);
  }
  fechaLista();
  return <>{out}</>;
}
function negrito(t) {
  const partes = t.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p));
}

function calcNutri(a) {
  if (!a?.peso || !a?.altura || !a?.idade) return null;
  const kg = Number(a.peso), cm = Number(a.altura), idade = Number(a.idade);
  const bmr = a.sexo === "Feminino" ? 10 * kg + 6.25 * cm - 5 * idade - 161 : 10 * kg + 6.25 * cm - 5 * idade + 5;
  const freq = Number(a.frequencia) || 3;
  const fator = freq <= 1 ? 1.3 : freq <= 3 ? 1.45 : freq <= 5 ? 1.6 : 1.725;
  const tdee = bmr * fator;
  const ajuste = /massa|hipertrofia/i.test(a.objetivo) ? 400 : /emagre/i.test(a.objetivo) ? -450 : 0;
  const kcalMeta = Math.round(tdee + ajuste);
  const referencia = ajuste > 0 ? "superávit pra ganhar peso" : ajuste < 0 ? "déficit pra emagrecer" : "manutenção";
  return { kcalMeta, referencia, macros: { prot: Math.round(kg * 2), gord: Math.round(kg * 0.9), carb: Math.max(0, Math.round((kcalMeta - kg * 2 * 4 - kg * 0.9 * 9) / 4)) } };
}

const css = `
.tr{--az:#1F5FE6;--ci:#0FB5C7;--vd:#1FA36E;--ink:#0C1A33;--mut:#5A6B87;--faint:#D6E0F0;--surf:#fff;}
.tr *{box-sizing:border-box;}

.trtabs{display:flex;gap:6px;background:rgba(226,236,252,.85);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);padding:4px;border-radius:14px;margin-bottom:18px;position:sticky;top:calc(8px + env(safe-area-inset-top));z-index:20;box-shadow:0 2px 10px rgba(12,26,51,.06);}
.trtab{flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;gap:6px;border:none;background:transparent;border-radius:10px;font-family:Inter,sans-serif;font-size:13.5px;font-weight:600;color:var(--mut);cursor:pointer;transition:background .2s,color .2s,transform .12s;}
.trtab:active{transform:scale(.96);}
.trtab.on{background:#fff;color:var(--az);box-shadow:0 1px 3px rgba(12,26,51,.12);animation:trtabpop .32s cubic-bezier(.35,1.1,.4,1);}

.trbtn{min-height:50px;padding:0 20px;background:linear-gradient(120deg,var(--ci),var(--az));color:#fff;border:none;border-radius:13px;font-family:Inter,sans-serif;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 10px 22px -10px rgba(31,95,230,.7);transition:filter .15s,transform .12s;}
.trbtn:hover:not(:disabled){filter:brightness(1.06);}
.trbtn:active:not(:disabled){transform:scale(.98);}
.trbtn:disabled{opacity:.5;cursor:default;}
.trbtn.grande{width:100%;}
.trbtn.ghost{background:transparent;border:1px solid var(--faint);color:var(--az);box-shadow:none;}
.trbtn.largo{width:100%;margin-top:16px;}
.trlink{background:transparent;border:none;color:var(--mut);font-family:Inter,sans-serif;font-size:13.5px;font-weight:600;cursor:pointer;min-height:44px;padding:0 6px;}
.trlink:hover{color:var(--az);}
.trlink:disabled{opacity:.5;}

.trintro{text-align:center;padding:14px 8px 8px;}
.trintroic{width:78px;height:78px;margin:0 auto 16px;border-radius:22px;background:linear-gradient(135deg,var(--az),var(--ci));color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 16px 32px -12px rgba(31,95,230,.6);}
.trintroh{font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;margin:0 0 8px;letter-spacing:-.02em;}
.trintrop{font-size:14.5px;line-height:1.6;color:var(--mut);margin:0 auto 18px;max-width:340px;}
.trintrolista{list-style:none;padding:0;margin:0 auto 22px;max-width:320px;text-align:left;display:flex;flex-direction:column;gap:10px;}
.trintrolista li{display:flex;gap:10px;align-items:center;font-size:14px;color:var(--ink);font-weight:500;}
.trintrolista li svg{color:var(--az);flex:none;}

.tranam{padding:2px;}
.tranamtopo{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.tranamdots{display:flex;gap:6px;}
.tranamdot{width:8px;height:8px;border-radius:50%;background:var(--faint);transition:all .3s;}
.tranamdot.on{background:var(--az);width:24px;border-radius:99px;}
.tranamdot.feito{background:var(--ci);}
.tranamh{font-family:'Bricolage Grotesque',sans-serif;font-size:21px;font-weight:800;letter-spacing:-.02em;margin:0 0 16px;}
.tranamcont{min-height:180px;}
.tranambtns{display:flex;gap:10px;margin-top:22px;}
.tranambtns .trbtn{flex:1;}

.trescolhas{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.trescolha{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:14px;background:var(--surf);border:1.5px solid var(--faint);border-radius:16px;cursor:pointer;text-align:left;transition:border-color .2s,box-shadow .2s,transform .12s;font-family:Inter,sans-serif;}
.trescolha.on{border-color:var(--az);box-shadow:0 8px 20px -10px rgba(31,95,230,.5);}
.trescolha:active{transform:scale(.98);}
.trescolhaic{width:42px;height:42px;border-radius:12px;color:#fff;display:flex;align-items:center;justify-content:center;margin-bottom:6px;}
.trescolhat{font-size:15px;font-weight:700;color:var(--ink);}
.trescolhad{font-size:12px;color:var(--mut);line-height:1.35;}

.trlabel{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);font-weight:700;margin:16px 0 8px;}
.trseg{display:flex;gap:6px;flex-wrap:wrap;}
.trseg.mini .trsegb{padding:0 12px;}
.trsegb{flex:1;min-width:70px;min-height:44px;padding:0 10px;border:1px solid var(--faint);background:var(--surf);border-radius:11px;font-family:Inter,sans-serif;font-size:13.5px;font-weight:600;color:var(--mut);cursor:pointer;transition:all .18s;}
.trsegb.on{background:var(--az);border-color:var(--az);color:#fff;transform:translateY(-1px);box-shadow:0 6px 14px -6px rgba(31,95,230,.7);}
.trsegb:active,.trfreqb:active,.trmultib:active,.trparqi:active{transform:scale(.97);}
.trfreq{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;}
.trfreqb{min-height:48px;border:1px solid var(--faint);background:var(--surf);border-radius:12px;font-family:'Space Mono',monospace;font-size:15px;font-weight:700;color:var(--mut);cursor:pointer;transition:all .18s;}
.trfreqb.on{background:linear-gradient(135deg,var(--az),#3E7BF0);border-color:transparent;color:#fff;transform:translateY(-2px);box-shadow:0 8px 16px -6px rgba(31,95,230,.7);}
.trmulti{display:flex;flex-direction:column;gap:9px;}
.trmultib,.trparqi{display:flex;align-items:center;gap:11px;padding:14px;background:var(--surf);border:1.5px solid var(--faint);border-radius:13px;font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:var(--ink);cursor:pointer;text-align:left;transition:border-color .2s,background .2s;}
.trparqi{font-weight:500;line-height:1.4;}
.trmultib.on,.trparqi.on{border-color:var(--az);background:#EAF1FF;}
.trcheck{flex:none;width:22px;height:22px;border-radius:7px;border:1.5px solid var(--faint);display:flex;align-items:center;justify-content:center;color:#fff;background:var(--surf);}
.trmultib.on .trcheck,.trparqi.on .trcheck{background:var(--az);border-color:var(--az);}
.trparq{display:flex;flex-direction:column;gap:8px;margin-bottom:6px;}
.trgrid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.trinput{width:100%;min-height:48px;border:1px solid var(--faint);border-radius:11px;padding:12px 13px;font-family:Inter,sans-serif;font-size:16px;color:var(--ink);background:var(--surf);outline:none;}
.trinput:focus{border-color:var(--az);box-shadow:0 0 0 3px rgba(31,95,230,.12);}
.trnota{font-size:13px;color:var(--mut);line-height:1.55;margin:0 0 14px;}
.travisosaude{display:flex;gap:8px;align-items:flex-start;background:#F4EAD4;border:1px solid #E8C97E;border-radius:12px;padding:11px 13px;font-size:13px;line-height:1.5;color:#7A5A12;margin-top:14px;}
.travisosaude svg{flex:none;margin-top:1px;}
.trerro{background:#FDECEC;border:1px solid #E9B4B1;border-radius:11px;padding:11px 13px;font-size:13.5px;color:#96322C;font-weight:500;margin:14px 0 0;}

.trplanotopo{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:16px;}
.trplanoeye{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--az);font-weight:700;}
.trplanoh{font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;letter-spacing:-.02em;margin:4px 0 3px;}
.trplanosub{font-size:13.5px;color:var(--mut);margin:0;}
.trmetas{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;}
.trmeta{background:radial-gradient(120% 130% at 18% 0%,#22508F,#0C1A33);border-radius:15px;padding:12px 6px;text-align:center;box-shadow:0 10px 22px -12px rgba(12,26,51,.6),0 1px 0 rgba(255,255,255,.06) inset;}
.trmetav{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:19px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums;}
.trmetal{display:block;font-size:10px;color:#9FB4D6;margin-top:3px;}
.trprescricao{display:flex;align-items:center;gap:8px;background:#E2ECFC;border-radius:12px;padding:11px 14px;font-size:13px;font-weight:600;color:var(--az);margin-bottom:16px;}
.trtreinos{display:flex;flex-direction:column;gap:10px;}
.trtreino{background:var(--surf);border:1px solid var(--faint);border-radius:20px;overflow:hidden;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 6px 22px -8px rgba(31,74,150,.20),0 2px 6px -2px rgba(31,74,150,.10);transition:box-shadow .2s,border-color .2s;}
.trtreino.on{box-shadow:0 12px 28px -14px rgba(31,74,150,.4);border-color:rgba(31,95,230,.4);}
.trtreino.done{border-color:rgba(31,163,110,.5);}
.trtreinohead{width:100%;display:flex;align-items:center;gap:13px;padding:14px;background:transparent;border:none;cursor:pointer;font-family:Inter,sans-serif;text-align:left;}
.trtreinoletra{flex:none;width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,var(--az),var(--ci));color:#fff;font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;display:flex;align-items:center;justify-content:center;}
.trtreino.done .trtreinoletra{background:linear-gradient(135deg,var(--vd),#3FD0A6);}
.trtreinoinfo{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
.trtreinoinfo strong{font-size:15px;color:var(--ink);}
.trtreinoinfo span{font-size:12.5px;color:var(--mut);}
.trchev{color:var(--mut);transition:transform .28s cubic-bezier(.35,1.1,.4,1);}
.trchev.ab{transform:rotate(90deg);color:var(--az);}
.trexlista{padding:0 12px 12px;display:flex;flex-direction:column;gap:8px;animation:trfade .25s ease;}
@keyframes trfade{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}
.trex{display:flex;align-items:center;gap:9px;padding:8px 9px;background:#F6F9FF;border:1px solid var(--faint);border-radius:13px;transition:border-color .2s,background .2s,opacity .2s;}
.trex.feito{background:#EAF7F0;border-color:rgba(31,163,110,.4);}
.trex.feito .trexnome{text-decoration:line-through;color:var(--mut);}
.trexcheck{position:relative;flex:none;width:30px;height:30px;border-radius:9px;border:1.5px solid var(--faint);background:#fff;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s cubic-bezier(.2,.9,.3,1.5);}
.trexcheck.on{background:linear-gradient(135deg,var(--vd),#3FD0A6);border-color:transparent;animation:trcheckpop .3s cubic-bezier(.2,.9,.3,1.4);}
.trexcheck.on::before{content:"";position:absolute;inset:-8px;border-radius:13px;border:2px solid var(--vd);animation:trcheckhalo .5s ease-out;pointer-events:none;}
.trexcorpo{flex:1;display:flex;align-items:center;gap:10px;background:transparent;border:none;cursor:pointer;text-align:left;font-family:Inter,sans-serif;min-width:0;padding:0;}
.trexinfo{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
.trexnome{font-size:14px;font-weight:600;color:var(--ink);}
.trexmeta{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums;}
.trexplay{flex:none;color:var(--az);}
.trcarga{position:relative;flex:none;}
.trcargain{width:52px;min-height:38px;border:1px solid var(--faint);border-radius:9px;text-align:center;font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:var(--ink);background:#fff;outline:none;padding:0 4px;}
.trcargain:focus{border-color:var(--az);}
.trcardio{display:flex;gap:7px;align-items:center;font-size:12.5px;color:#8A5E0E;background:#F4EAD4;border-radius:10px;padding:9px 12px;margin:2px 0 0;}
.trdica{display:flex;gap:7px;align-items:flex-start;font-size:12.5px;color:var(--mut);line-height:1.5;margin:16px 2px 0;}
.trdica svg{flex:none;margin-top:1px;color:var(--az);}

/* dieta */
.trmacrocard{position:relative;overflow:hidden;background:radial-gradient(130% 130% at 85% 0%,#1B3C77,#0C1A33);border-radius:22px;padding:18px;margin-bottom:16px;box-shadow:0 18px 40px -14px rgba(12,26,51,.55),0 1px 0 rgba(255,255,255,.07) inset;color:#fff;}
.trmacrocard::before{content:"";position:absolute;inset:-40% -10% auto -10%;height:150%;pointer-events:none;background:radial-gradient(45% 42% at 30% 18%,rgba(63,208,230,.22),transparent 70%),radial-gradient(42% 40% at 82% 8%,rgba(90,148,242,.24),transparent 72%);animation:auroraflutua 12s ease-in-out infinite;}
.trmacrocard>*{position:relative;}
.trmacrotopo{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;}
.trmacroeye{display:flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#7FE3EE;font-weight:700;}
.trmacrokcal{font-family:'Bricolage Grotesque',sans-serif;font-size:38px;font-weight:800;line-height:1;margin:8px 0 4px;font-variant-numeric:tabular-nums;}
.trmacrokcal span{font-size:15px;color:#9FB4D6;font-weight:600;}
.trmacroref{font-size:12px;color:#9FB4D6;}
.trmacrobars{display:flex;flex-direction:column;gap:9px;}
.trbarmac{}
.trbarmactop{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;color:#DDE6F5;font-variant-numeric:tabular-nums;}
.trbartrilho{height:8px;background:rgba(255,255,255,.12);border-radius:99px;overflow:hidden;}
.trbarfill{height:100%;border-radius:99px;transition:width .6s cubic-bezier(.2,.8,.2,1);}
.trdietavazio{text-align:center;background:var(--surf);border:1px solid var(--faint);border-radius:20px;padding:22px 18px;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 6px 22px -8px rgba(31,74,150,.20),0 2px 6px -2px rgba(31,74,150,.10);}
.trdietavazio>p{font-size:14.5px;line-height:1.55;color:var(--ink);margin:0 0 16px;}
.trcardaptopo{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.trcardaph{font-family:'Bricolage Grotesque',sans-serif;font-size:19px;font-weight:800;margin:0;}
.trcardapresumo{font-size:13.5px;color:var(--mut);line-height:1.5;margin:0 0 10px;}
.trcardaptotais{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.trcardaptotais span{font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:var(--az);background:#E2ECFC;padding:5px 11px;border-radius:99px;}
.trrefeicoes{display:flex;flex-direction:column;gap:10px;}
.trrefeicao{background:var(--surf);border:1px solid var(--faint);border-radius:20px;padding:15px;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 6px 22px -8px rgba(31,74,150,.20),0 2px 6px -2px rgba(31,74,150,.10);}
.trrefhead{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.trrefic{flex:none;width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,var(--vd),#3FD0A6);color:#fff;display:flex;align-items:center;justify-content:center;}
.trrefinfo{flex:1;display:flex;flex-direction:column;gap:1px;}
.trrefinfo strong{font-size:15px;color:var(--ink);}
.trrefinfo span{font-size:12px;color:var(--mut);font-family:'Space Mono',monospace;}
.trrefkcal{font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:var(--vd);background:#EAF7F0;padding:4px 10px;border-radius:99px;}
.trreflista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;}
.trreflista li{display:flex;justify-content:space-between;gap:10px;align-items:baseline;font-size:13.5px;color:var(--ink);}
.trrefalim{flex:1;}
.trrefalim em{color:var(--mut);font-style:normal;font-size:12.5px;}
.trrefmac{font-family:'Space Mono',monospace;font-size:11.5px;color:var(--mut);flex:none;}
.trajuste{display:flex;gap:8px;margin-top:14px;}
.trbusca{margin-top:20px;}
.tralimentos{display:flex;flex-direction:column;gap:6px;margin-top:10px;}
.tralimento{display:flex;flex-direction:column;gap:2px;background:var(--surf);border:1px solid var(--faint);border-radius:11px;padding:10px 12px;}
.tralimnome{font-size:13.5px;font-weight:600;color:var(--ink);}
.tralimmac{font-family:'Space Mono',monospace;font-size:11.5px;color:var(--mut);}
.tralimmac em{font-style:normal;opacity:.7;}
.trperguntar{margin-top:20px;background:var(--surf);border:1px solid var(--faint);border-radius:20px;overflow:hidden;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 6px 22px -8px rgba(31,74,150,.20),0 2px 6px -2px rgba(31,74,150,.10);}
.trperguntar>summary{padding:15px;font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:var(--vd);cursor:pointer;display:flex;align-items:center;gap:8px;list-style:none;}
.trperguntar>summary::-webkit-details-marker{display:none;}
.trperguntar[open]>summary{border-bottom:1px solid var(--faint);}

/* modal exercício */
.trfundo{position:fixed;inset:0;background:rgba(12,26,51,.6);display:flex;align-items:flex-end;justify-content:center;z-index:60;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:trfundoin .2s;}
@keyframes trfundoin{from{opacity:0;}to{opacity:1;}}
.trfolha{position:relative;background:#F4F7FD;width:100%;max-width:520px;border-radius:22px 22px 0 0;padding:10px 18px 0;max-height:92dvh;overflow-y:auto;overscroll-behavior:contain;animation:trsobe .3s cubic-bezier(.2,.8,.2,1);}
.trfechax{margin-left:auto;align-self:flex-start;flex:none;width:34px;height:34px;border-radius:10px;border:1px solid var(--faint);background:#fff;color:var(--mut);font-size:22px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.trfechax:hover{color:var(--ink);}
/* barra de ação colada no rodapé da folha: FEITO sempre à mão, mesmo rolando as dicas */
.trmodalacoes{position:sticky;bottom:0;display:flex;gap:10px;padding:12px 0 calc(16px + env(safe-area-inset-bottom));margin-top:10px;background:linear-gradient(180deg,rgba(244,247,253,0),#F4F7FD 24%);}
.trmodalacoes .trbtn{flex:1;}
.trbtn.feito{background:#fff;border:1.5px solid var(--vd);color:var(--vd);box-shadow:none;display:flex;align-items:center;justify-content:center;gap:7px;}
.trbtn.feito.on{background:linear-gradient(135deg,var(--vd),#3FD0A6);border-color:transparent;color:#fff;box-shadow:0 10px 22px -10px rgba(31,163,110,.7);}
@keyframes trsobe{from{transform:translateY(30px);}to{transform:translateY(0);}}
.trpuxador{width:40px;height:4px;border-radius:99px;background:var(--faint);margin:6px auto 14px;}
.trexcab{display:flex;gap:12px;align-items:center;margin-bottom:14px;}
.trexh{font-family:'Bricolage Grotesque',sans-serif;font-size:19px;font-weight:800;margin:0;letter-spacing:-.01em;line-height:1.15;}
.trexsub{display:flex;align-items:center;gap:5px;font-size:12.5px;color:var(--mut);margin:3px 0 0;font-variant-numeric:tabular-nums;}
.trvidwrap{margin-bottom:14px;}
.trvid{width:100%;border-radius:16px;background:#0C1A33;aspect-ratio:1;object-fit:cover;box-shadow:0 14px 30px -14px rgba(12,26,51,.5);}
.trvidload{width:100%;aspect-ratio:1;border-radius:16px;background:linear-gradient(120deg,#DCE7FA,#EEF3FD,#DCE7FA);background-size:200% 100%;animation:trshine 1.3s linear infinite;display:flex;align-items:center;justify-content:center;color:var(--mut);font-size:13px;margin-bottom:14px;}
.trvidbtns{display:flex;gap:6px;margin-top:8px;}
.trvidb{flex:1;min-height:40px;border:1px solid var(--faint);background:transparent;border-radius:11px;font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:var(--mut);cursor:pointer;transition:all .18s;}
.trvidb.on{background:var(--az);border-color:var(--az);color:#fff;box-shadow:0 5px 12px -5px rgba(31,95,230,.6);}
.trcargamodal{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid var(--faint);border-radius:13px;padding:12px 14px;margin-bottom:14px;}
.trcargamodal>span{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--ink);}
.trcargamodalin{display:flex;align-items:center;gap:6px;}
.trcargamodalin input{width:70px;min-height:42px;border:1px solid var(--faint);border-radius:10px;text-align:center;font-family:'Space Mono',monospace;font-size:16px;font-weight:700;color:var(--az);outline:none;}
.trcargamodalin input:focus{border-color:var(--az);}
.trcargamodalin>span{font-size:13px;color:var(--mut);}
.trequip{display:inline-block;font-family:'Space Mono',monospace;font-size:11px;color:var(--az);background:#E2ECFC;padding:4px 10px;border-radius:99px;margin-bottom:12px;}
.trbloco{margin-bottom:14px;}
.trbloco.cuidado .trblocoh{color:#8A5E0E;}
.trblocoh{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--ink);margin:0 0 8px;text-transform:uppercase;letter-spacing:.04em;}
.trpassos{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;}
.trpassos li{font-size:14px;line-height:1.55;color:var(--ink);}
.trpassos li::marker{color:var(--az);font-weight:700;}
.trtexto{font-size:13.5px;line-height:1.6;color:var(--mut);margin:0;}

/* chat */
.trchat{display:flex;flex-direction:column;height:calc(100dvh - 300px);min-height:420px;}
.trchat.compacto{height:auto;min-height:0;padding:12px;}
.trchat.compacto .trmsgs{max-height:340px;}
.trchathead{display:flex;gap:11px;align-items:center;padding:0 2px 12px;border-bottom:1px solid var(--faint);margin-bottom:12px;}
.trchatavatar{flex:none;width:42px;height:42px;border-radius:13px;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px -8px rgba(31,95,230,.6);}
.trchathead strong{display:block;font-size:15px;color:var(--ink);}
.trchathead span{font-size:12.5px;color:var(--mut);}
.trmsgs{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding:4px 2px;}
.trvazio{text-align:center;color:var(--mut);padding:24px 8px;}
.trvazio>p{font-size:14px;margin:0 0 16px;}
.trsug{display:flex;flex-direction:column;gap:8px;}
.trsugb{padding:12px 14px;background:#EAF1FF;border:1px solid rgba(31,95,230,.25);border-radius:12px;color:var(--az);font-family:Inter,sans-serif;font-size:13.5px;font-weight:600;cursor:pointer;text-align:left;transition:background .2s;}
.trsugb:hover{background:#DCE8FF;}
.trmsg{max-width:88%;padding:11px 14px;border-radius:16px;font-size:14px;line-height:1.55;}
.trmsg.user{align-self:flex-end;background:linear-gradient(120deg,var(--az),#3E7BF0);color:#fff;border-bottom-right-radius:5px;}
.trmsg.assistant{align-self:flex-start;background:#fff;border:1px solid var(--faint);color:var(--ink);border-bottom-left-radius:5px;box-shadow:0 4px 12px -8px rgba(31,74,150,.3);}
.trmsg.erro{background:#FDECEC;border-color:#E9B4B1;color:#96322C;}
.trmsg p{margin:0 0 8px;}.trmsg p:last-child{margin:0;}
.trmsg h5{margin:8px 0 6px;font-size:14px;font-weight:800;color:var(--az);}
.trmsg ul{margin:6px 0;padding-left:18px;}.trmsg li{margin:3px 0;}
.trmsg strong{font-weight:700;}
.trtabrow{font-family:'Space Mono',monospace;font-size:12px;padding:3px 0;border-bottom:1px solid var(--faint);}
.trdigitando{display:inline-flex;gap:4px;padding:3px 0;}
.trdigitando i{width:7px;height:7px;border-radius:50%;background:var(--mut);animation:trbolinha 1.2s infinite ease-in-out;}
.trdigitando i:nth-child(2){animation-delay:.2s;}.trdigitando i:nth-child(3){animation-delay:.4s;}
@keyframes trbolinha{0%,60%,100%{opacity:.3;transform:translateY(0);}30%{opacity:1;transform:translateY(-4px);}}
.trentrada,.trajuste{display:flex;gap:8px;}
.trchat .trentrada{padding-top:12px;margin-top:8px;border-top:1px solid var(--faint);}
.trcampo{flex:1;min-height:48px;border:1px solid var(--faint);border-radius:14px;padding:12px 15px;font-family:Inter,sans-serif;font-size:16px;color:var(--ink);background:#fff;outline:none;}
.trcampo:focus{border-color:var(--az);box-shadow:0 0 0 3px rgba(31,95,230,.12);}
.trmandar{flex:none;width:48px;height:48px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--az),var(--ci));color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:filter .15s,transform .12s;}
.trmandar:hover:not(:disabled){filter:brightness(1.08);}
.trmandar:active:not(:disabled){transform:scale(.94);}
.trmandar:disabled{opacity:.4;cursor:default;}
.trchatoff{text-align:center;padding:40px 16px;color:var(--mut);}
.trchatofic{display:inline-flex;width:70px;height:70px;border-radius:20px;background:#E2ECFC;color:var(--az);align-items:center;justify-content:center;margin-bottom:14px;}
.trchatoff p{font-size:14px;line-height:1.6;margin:0 0 6px;}
.trchatoff code{font-family:'Space Mono',monospace;font-size:12px;background:#E2ECFC;padding:2px 6px;border-radius:6px;color:var(--az);}

/* progresso do dia */
.trprogwrap{margin-bottom:16px;}
.trprog{height:9px;background:#E2ECFC;border-radius:99px;overflow:hidden;box-shadow:0 1px 2px rgba(12,26,51,.06) inset;}
.trprogfill{height:100%;background:linear-gradient(90deg,var(--az),var(--ci));border-radius:99px;transition:width .5s cubic-bezier(.2,.8,.2,1);box-shadow:0 0 10px rgba(15,181,199,.5);}
.trprogtxt{display:block;font-size:12px;color:var(--mut);margin-top:6px;font-variant-numeric:tabular-nums;}
/* celebração ao fechar um bloco */
.trcelebra{position:relative;overflow:hidden;background:linear-gradient(100deg,var(--az),var(--ci));color:#fff;font-weight:700;font-size:13.5px;padding:11px 14px;border-radius:12px;margin:0 12px 12px;box-shadow:0 10px 24px -10px rgba(31,95,230,.6);animation:trpop .35s cubic-bezier(.2,.9,.3,1.3);}
.trcelebra::after{content:"";position:absolute;top:0;left:-60%;width:50%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-18deg);animation:trvarre 2.4s ease-in-out .3s infinite;}
.trtreino.done{border-color:rgba(31,163,110,.55);}
.trtreino.done .trtreinoletra{background:linear-gradient(135deg,var(--vd),#3FD0A6);animation:trdonepop .5s cubic-bezier(.2,.9,.3,1.5);}
/* skeleton do cardápio (a espera vira antecipação) */
.trcardapskel{}
.trskeltxt{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--vd);font-weight:600;margin:0 0 14px;}
.trrefskel{height:80px;border-radius:20px;background:linear-gradient(120deg,#E9EFFB,#F6F9FF,#E9EFFB);background-size:200% 100%;animation:trshine 1.3s linear infinite;margin-bottom:10px;}
/* fade de troca de sub-aba + entrada escalonada dos cards */
.trvista{animation:trfade .28s cubic-bezier(.2,.7,.3,1);}
.trtreinos>.trtreino{animation:trcardin .4s cubic-bezier(.2,.7,.3,1) both;}
.trtreinos>.trtreino:nth-child(1){animation-delay:.04s;}
.trtreinos>.trtreino:nth-child(2){animation-delay:.10s;}
.trtreinos>.trtreino:nth-child(3){animation-delay:.16s;}
.trtreinos>.trtreino:nth-child(4){animation-delay:.22s;}
.trrefeicoes>.trrefeicao{animation:trcardin .38s ease both;}
.trrefeicoes>.trrefeicao:nth-child(2){animation-delay:.05s;}
.trrefeicoes>.trrefeicao:nth-child(3){animation-delay:.10s;}
.trrefeicoes>.trrefeicao:nth-child(4){animation-delay:.15s;}
.trrefeicoes>.trrefeicao:nth-child(5){animation-delay:.20s;}
.trrefeicoes>.trrefeicao:nth-child(6){animation-delay:.25s;}
@keyframes trcheckpop{0%{transform:scale(.7);}60%{transform:scale(1.16);}100%{transform:scale(1);}}
@keyframes trcheckhalo{0%{opacity:.6;transform:scale(.8);}100%{opacity:0;transform:scale(1.6);}}
@keyframes trshine{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
@keyframes trtabpop{from{transform:scale(.94);}to{transform:scale(1);}}
@keyframes trdonepop{0%{transform:scale(1);}40%{transform:scale(1.18) rotate(-4deg);}100%{transform:scale(1) rotate(0);}}
@keyframes trcardin{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
@keyframes trpop{from{transform:scale(.9);opacity:0;}to{transform:scale(1);opacity:1;}}
@keyframes trvarre{0%{left:-60%;}55%,100%{left:130%;}}
/* carga: flash ao salvar + recorde */
.trcargain.f-ok{border-color:var(--vd);box-shadow:0 0 0 3px rgba(31,163,110,.18);}
.trcargain.f-recorde{border-color:var(--gold,#C98A24);box-shadow:0 0 0 3px rgba(232,166,60,.28);animation:trcheckpop .35s cubic-bezier(.2,.9,.3,1.4);}
.trcargamodalin input.f-ok{border-color:var(--vd)!important;box-shadow:0 0 0 3px rgba(31,163,110,.18);}
.trrecorde{position:absolute;bottom:calc(100% + 4px);right:0;white-space:nowrap;font-family:Inter,sans-serif;font-size:10.5px;font-weight:700;color:#fff;background:linear-gradient(120deg,#E8A24E,#E8722C);padding:3px 8px;border-radius:99px;box-shadow:0 4px 10px -3px rgba(232,114,44,.6);animation:trpop .3s cubic-bezier(.2,.9,.3,1.4);z-index:3;}
/* mini-evolução de carga (barras) */
.trevobarras{display:flex;align-items:flex-end;gap:6px;height:70px;padding:4px 0;}
.trevocol{flex:1;display:flex;align-items:flex-end;justify-content:center;height:100%;}
.trevobar{width:100%;max-width:26px;border-radius:6px 6px 0 0;background:linear-gradient(180deg,var(--ci),var(--az));box-shadow:0 3px 8px -3px rgba(31,95,230,.5);transition:height .5s cubic-bezier(.2,.8,.2,1);}
.trevotxt{font-size:13px;line-height:1.5;color:var(--mut);margin:10px 0 0;}
@media (prefers-reduced-motion:reduce){.tr *,.tr *::before,.tr *::after{animation:none!important;transition:none!important;}}
@media (max-width:380px){.trescolhas{grid-template-columns:1fr;}.trmetav{font-size:17px;}.trmacrokcal{font-size:32px;}}
`;
