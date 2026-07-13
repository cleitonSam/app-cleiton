import React, { useEffect, useRef, useState } from "react";
import { api, conversarIA, semConexao } from "./api.js";
import {
  BadgeGrupo,
  IcAlvo,
  IcApito,
  IcChama,
  IcCheque,
  IcChevron,
  IcCorpo,
  IcEnviar,
  IcHalter,
  IcInfo,
  IcMaca,
  IcPlay,
  IcRelogio,
  IcTroca,
} from "./Icones.jsx";

// ─── Aba Treino ───────────────────────────────────────────────────────────────
// Anamnese → plano de treino (exercícios reais com vídeo) + personal e
// nutricionista de IA. Tudo puxando da biblioteca de verdade; nada inventado.

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

  // prefill de peso a partir do que o app já sabe
  const pesoSalvo = s.weight?.log?.length ? s.weight.log[s.weight.log.length - 1].kg : "";

  const salvarAnamneseEPlano = (anamnese, plano) =>
    setS((x) => ({ ...x, treino: { anamnese, plano } }));

  return (
    <section className="tr">
      <style>{css}</style>

      {/* topo com as sub-abas */}
      <div className="trtabs">
        <button className={"trtab" + (vista === "plano" || vista === "intro" ? " on" : "")} onClick={() => setVista(temPlano ? "plano" : "intro")}>
          <IcHalter size={18} /> Treino
        </button>
        <button className={"trtab" + (vista === "personal" ? " on" : "")} onClick={() => setVista("personal")}>
          <IcApito size={18} /> Personal
        </button>
        <button className={"trtab" + (vista === "nutri" ? " on" : "")} onClick={() => setVista("nutri")}>
          <IcMaca size={18} /> Nutri
        </button>
      </div>

      {vista === "intro" && <Intro onComecar={() => setVista("anamnese")} />}

      {vista === "anamnese" && (
        <Anamnese
          inicial={treino.anamnese}
          pesoSalvo={pesoSalvo}
          onCancelar={() => setVista(temPlano ? "plano" : "intro")}
          onPronto={(anamnese, plano) => {
            salvarAnamneseEPlano(anamnese, plano);
            setVista("plano");
          }}
        />
      )}

      {vista === "plano" && temPlano && (
        <Plano
          plano={treino.plano}
          anamnese={treino.anamnese}
          onRefazer={() => setVista("anamnese")}
          onAbrirEx={setExAberto}
        />
      )}
      {vista === "plano" && !temPlano && <Intro onComecar={() => setVista("anamnese")} />}

      {vista === "personal" && <Chat agente="personal" anamnese={treino.anamnese} plano={treino.plano} iaAtiva={iaAtiva} />}
      {vista === "nutri" && <Chat agente="nutri" anamnese={treino.anamnese} plano={treino.plano} iaAtiva={iaAtiva} />}

      {exAberto && <ExercicioModal item={exAberto} onFechar={() => setExAberto(null)} />}
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
    // 0 — objetivo
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
    // 1 — nível, frequência, tempo
    {
      titulo: "Como é a sua rotina de treino?",
      valido: true,
      conteudo: (
        <>
          <label className="trlabel">Seu nível</label>
          <div className="trseg">{NIVEIS.map((n) => <button key={n} className={"trsegb" + (a.nivel === n ? " on" : "")} onClick={() => set({ nivel: n })}>{n}</button>)}</div>

          <label className="trlabel">Quantos dias por semana?</label>
          <div className="trfreq">
            {[1, 2, 3, 4, 5, 6].map((f) => <button key={f} className={"trfreqb" + (a.frequencia === f ? " on" : "")} onClick={() => set({ frequencia: f })}>{f}x</button>)}
          </div>

          <label className="trlabel">Tempo por treino</label>
          <div className="trseg">{TEMPOS.map((t) => <button key={t} className={"trsegb" + (a.tempo === t ? " on" : "")} onClick={() => set({ tempo: t })}>{t}</button>)}</div>
        </>
      ),
    },
    // 2 — equipamentos
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
    // 3 — corpo (pra nutrição)
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
    // 4 — saúde (PAR-Q)
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

// ─── Plano ────────────────────────────────────────────────────────────────────
function Plano({ plano, anamnese, onRefazer, onAbrirEx }) {
  const [aberto, setAberto] = useState(0); // qual treino (A/B/C…) está aberto
  const nut = calcNutri(anamnese);

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

      {/* metas nutricionais */}
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

      {/* treinos A/B/C… */}
      <div className="trtreinos">
        {plano.treinos.map((t, i) => {
          const on = aberto === i;
          return (
            <div key={t.nome} className={"trtreino" + (on ? " on" : "")}>
              <button className="trtreinohead" onClick={() => setAberto(on ? -1 : i)}>
                <span className="trtreinoletra">{t.nome.replace("Treino ", "")}</span>
                <span className="trtreinoinfo"><strong>{t.nome}</strong><span>{t.foco} · {t.exercicios.length} exercícios</span></span>
                <span className={"trchev" + (on ? " ab" : "")}><IcChevron size={18} /></span>
              </button>
              {on && (
                <div className="trexlista">
                  {t.exercicios.map((ex) => (
                    <button key={ex.id} className="trex" onClick={() => onAbrirEx(ex)}>
                      <BadgeGrupo grupo={ex.grupo} size={38} />
                      <span className="trexinfo">
                        <span className="trexnome">{ex.nome}</span>
                        <span className="trexmeta">{ex.series} × {ex.reps} · {ex.grupo}</span>
                      </span>
                      <span className="trexplay"><IcPlay size={20} /></span>
                    </button>
                  ))}
                  {plano.prescricao.cardio && <p className="trcardio"><IcChama size={15} /> Cardio: {plano.prescricao.cardio}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modal do exercício (vídeo + execução) ────────────────────────────────────
function ExercicioModal({ item, onFechar }) {
  const [detalhe, setDetalhe] = useState(null);
  const [erro, setErro] = useState(null);
  const [vi, setVi] = useState(0);

  useEffect(() => {
    let vivo = true;
    const aoTecla = (e) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", aoTecla);
    api
      .treinoExercicio(item.id)
      .then((d) => vivo && setDetalhe(d))
      .catch((e) => vivo && setErro(semConexao(e) ? "Sem internet." : e.message));
    return () => {
      vivo = false;
      document.removeEventListener("keydown", aoTecla);
    };
  }, [item.id, onFechar]);

  const passos = (detalhe?.passos || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const dicas = (detalhe?.dicas || "").split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div className="trfundo" onClick={onFechar}>
      <div className="trfolha" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={item.nome}>
        <div className="trpuxador" />
        <div className="trexcab">
          <BadgeGrupo grupo={item.grupo} size={40} />
          <div>
            <h3 className="trexh">{item.nome}</h3>
            <p className="trexsub">{item.series} × {item.reps} · descanso {item.descanso} · {item.grupo}</p>
          </div>
        </div>

        {erro && <p className="trerro">{erro}</p>}

        {!detalhe && !erro && <div className="trvidload">carregando vídeo…</div>}

        {detalhe?.videos?.length > 0 && (
          <div className="trvidwrap">
            {/* key força recriar o <video> ao trocar de ângulo */}
            <video key={vi} className="trvid" src={detalhe.videos[vi]} autoPlay loop muted playsInline controls={false} />
            {detalhe.videos.length > 1 && (
              <div className="trvidbtns">
                {detalhe.videos.map((_, i) => <button key={i} className={"trvidb" + (vi === i ? " on" : "")} onClick={() => setVi(i)}>{i === 0 ? "Frente" : "Lado"}</button>)}
              </div>
            )}
          </div>
        )}

        {detalhe && (
          <>
            <span className="trequip">{detalhe.equip} · {detalhe.nivel}</span>
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
              <div className="trbloco cuidado">
                <h4 className="trblocoh"><IcInfo size={15} /> Cuidados</h4>
                <p className="trtexto">{detalhe.cuidados}</p>
              </div>
            )}
            {detalhe.substituicoes && (
              <div className="trbloco">
                <h4 className="trblocoh"><IcTroca size={15} /> Dá pra trocar por</h4>
                <p className="trtexto">{detalhe.substituicoes}</p>
              </div>
            )}
          </>
        )}

        <button className="trbtn ghost largo" onClick={onFechar}>Fechar</button>
      </div>
    </div>
  );
}

// ─── Chat de IA (personal / nutri) ────────────────────────────────────────────
function Chat({ agente, anamnese, plano, iaAtiva }) {
  const ehNutri = agente === "nutri";
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef(null);
  const abortRef = useRef(null);

  const sugestoes = ehNutri
    ? ["Monta minha dieta do dia", "O que comer pós-treino?", "Lanche pra ganhar massa"]
    : ["Ajusta meu treino de hoje", "Como fazer agachamento certo?", "Tô sem tempo, encurta o treino"];

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

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

  if (!iaAtiva) {
    return (
      <div className="trchatoff">
        <span className="trchatofic">{ehNutri ? <IcMaca size={34} /> : <IcApito size={34} />}</span>
        <p>O {ehNutri ? "nutricionista" : "personal"} de IA ainda não foi ligado neste servidor.</p>
        <p className="trnota">Peça pro administrador definir a chave <code>OPENROUTER_API_KEY</code>.</p>
      </div>
    );
  }

  return (
    <div className="trchat">
      <div className="trchathead">
        <span className="trchatavatar" style={{ background: ehNutri ? "linear-gradient(135deg,#1FA36E,#3FD0A6)" : "linear-gradient(135deg,#1F5FE6,#0FB5C7)" }}>
          {ehNutri ? <IcMaca size={20} /> : <IcApito size={20} />}
        </span>
        <div>
          <strong>{ehNutri ? "Seu nutricionista" : "Seu personal"}</strong>
          <span>{ehNutri ? "monta sua dieta com comida de verdade" : "ajusta seu treino e ensina a execução"}</span>
        </div>
      </div>

      <div className="trmsgs">
        {msgs.length === 0 && (
          <div className="trvazio">
            <p>{ehNutri ? "Me pergunta sobre comida, calorias, dieta…" : "Me pergunta sobre treino, exercício, execução…"}</p>
            <div className="trsug">
              {sugestoes.map((sg) => <button key={sg} className="trsugb" onClick={() => enviar(sg)}>{sg}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={"trmsg " + m.role + (m.erro ? " erro" : "")}>
            {m.content ? <Markdownzinho texto={m.content} /> : <span className="trdigitando"><i /><i /><i /></span>}
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      <form
        className="trentrada"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <input
          className="trcampo"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={ehNutri ? "Pergunta sobre dieta…" : "Pergunta sobre treino…"}
          enterKeyHint="send"
          disabled={enviando}
        />
        <button className="trmandar" type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar"><IcEnviar size={20} /></button>
      </form>
    </div>
  );
}

// markdown minimalista (negrito, listas, tabelas simples) — sem lib
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

// mesma conta do servidor (Mifflin-St Jeor), pra mostrar as metas no plano sem ida à rede
function calcNutri(a) {
  if (!a?.peso || !a?.altura || !a?.idade) return null;
  const kg = Number(a.peso), cm = Number(a.altura), idade = Number(a.idade);
  const bmr = a.sexo === "Feminino" ? 10 * kg + 6.25 * cm - 5 * idade - 161 : 10 * kg + 6.25 * cm - 5 * idade + 5;
  const freq = Number(a.frequencia) || 3;
  const fator = freq <= 1 ? 1.3 : freq <= 3 ? 1.45 : freq <= 5 ? 1.6 : 1.725;
  const tdee = bmr * fator;
  const ajuste = /massa|hipertrofia/i.test(a.objetivo) ? 400 : /emagre/i.test(a.objetivo) ? -450 : 0;
  const kcalMeta = Math.round(tdee + ajuste);
  return { kcalMeta, macros: { prot: Math.round(kg * 2), gord: Math.round(kg * 0.9), carb: Math.max(0, Math.round((kcalMeta - kg * 2 * 4 - kg * 0.9 * 9) / 4)) } };
}

const css = `
.tr{--az:#1F5FE6;--ci:#0FB5C7;--ink:#0C1A33;--mut:#5A6B87;--faint:#D6E0F0;--surf:#fff;}
.tr *{box-sizing:border-box;}

.trtabs{display:flex;gap:6px;background:#E2ECFC;padding:4px;border-radius:14px;margin-bottom:18px;position:sticky;top:calc(8px + env(safe-area-inset-top));z-index:20;}
.trtab{flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;gap:6px;border:none;background:transparent;border-radius:10px;font-family:Inter,sans-serif;font-size:13.5px;font-weight:600;color:var(--mut);cursor:pointer;transition:background .2s,color .2s;}
.trtab.on{background:#fff;color:var(--az);box-shadow:0 2px 6px -2px rgba(31,74,150,.3);}

.trbtn{min-height:50px;padding:0 20px;background:linear-gradient(120deg,var(--ci),var(--az));color:#fff;border:none;border-radius:13px;font-family:Inter,sans-serif;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 10px 22px -10px rgba(31,95,230,.7);transition:filter .15s,transform .12s;}
.trbtn:hover:not(:disabled){filter:brightness(1.06);}
.trbtn:active:not(:disabled){transform:scale(.98);}
.trbtn:disabled{opacity:.5;cursor:default;}
.trbtn.grande{width:100%;}
.trbtn.ghost{background:transparent;border:1px solid var(--faint);color:var(--az);box-shadow:none;}
.trbtn.largo{width:100%;margin-top:16px;}
.trlink{background:transparent;border:none;color:var(--mut);font-family:Inter,sans-serif;font-size:13.5px;font-weight:600;cursor:pointer;min-height:44px;padding:0 6px;}
.trlink:hover{color:var(--az);}

/* intro */
.trintro{text-align:center;padding:14px 8px 8px;}
.trintroic{width:78px;height:78px;margin:0 auto 16px;border-radius:22px;background:linear-gradient(135deg,var(--az),var(--ci));color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 16px 32px -12px rgba(31,95,230,.6);}
.trintroh{font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;margin:0 0 8px;letter-spacing:-.02em;}
.trintrop{font-size:14.5px;line-height:1.6;color:var(--mut);margin:0 auto 18px;max-width:340px;}
.trintrolista{list-style:none;padding:0;margin:0 auto 22px;max-width:300px;text-align:left;display:flex;flex-direction:column;gap:10px;}
.trintrolista li{display:flex;gap:10px;align-items:center;font-size:14px;color:var(--ink);font-weight:500;}
.trintrolista li svg{color:var(--az);flex:none;}

/* anamnese */
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
.trsegb.on{background:var(--az);border-color:var(--az);color:#fff;box-shadow:0 6px 14px -6px rgba(31,95,230,.7);}
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

/* plano */
.trplanotopo{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:16px;}
.trplanoeye{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--az);font-weight:700;}
.trplanoh{font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;letter-spacing:-.02em;margin:4px 0 3px;}
.trplanosub{font-size:13.5px;color:var(--mut);margin:0;}
.trmetas{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;}
.trmeta{background:radial-gradient(120% 130% at 80% 0%,#22508F,#0C1A33);border-radius:14px;padding:12px 6px;text-align:center;box-shadow:0 10px 22px -12px rgba(12,26,51,.6);}
.trmetav{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:19px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums;}
.trmetal{display:block;font-size:10px;color:#9FB4D6;margin-top:3px;}
.trprescricao{display:flex;align-items:center;gap:8px;background:#E2ECFC;border-radius:12px;padding:11px 14px;font-size:13px;font-weight:600;color:var(--az);margin-bottom:16px;}

.trtreinos{display:flex;flex-direction:column;gap:10px;}
.trtreino{background:var(--surf);border:1px solid var(--faint);border-radius:16px;overflow:hidden;box-shadow:0 4px 14px -8px rgba(31,74,150,.2);transition:box-shadow .2s;}
.trtreino.on{box-shadow:0 12px 28px -14px rgba(31,74,150,.4);border-color:rgba(31,95,230,.4);}
.trtreinohead{width:100%;display:flex;align-items:center;gap:13px;padding:14px;background:transparent;border:none;cursor:pointer;font-family:Inter,sans-serif;text-align:left;}
.trtreinoletra{flex:none;width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,var(--az),var(--ci));color:#fff;font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;display:flex;align-items:center;justify-content:center;}
.trtreinoinfo{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
.trtreinoinfo strong{font-size:15px;color:var(--ink);}
.trtreinoinfo span{font-size:12.5px;color:var(--mut);}
.trchev{color:var(--mut);transition:transform .25s;}
.trchev.ab{transform:rotate(90deg);color:var(--az);}
.trexlista{padding:0 12px 12px;display:flex;flex-direction:column;gap:8px;animation:trfade .25s ease;}
@keyframes trfade{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}
.trex{display:flex;align-items:center;gap:12px;padding:10px;background:#F6F9FF;border:1px solid var(--faint);border-radius:13px;cursor:pointer;text-align:left;font-family:Inter,sans-serif;transition:border-color .2s,background .2s,transform .12s;}
.trex:hover{border-color:var(--az);background:#EEF4FF;}
.trex:active{transform:scale(.99);}
.trexinfo{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
.trexnome{font-size:14px;font-weight:600;color:var(--ink);}
.trexmeta{font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums;}
.trexplay{flex:none;color:var(--az);}
.trcardio{display:flex;gap:7px;align-items:center;font-size:12.5px;color:#8A5E0E;background:#F4EAD4;border-radius:10px;padding:9px 12px;margin:2px 0 0;}

/* modal exercício */
.trfundo{position:fixed;inset:0;background:rgba(12,26,51,.6);display:flex;align-items:flex-end;justify-content:center;z-index:60;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:trfundoin .2s;}
@keyframes trfundoin{from{opacity:0;}to{opacity:1;}}
.trfolha{background:#F4F7FD;width:100%;max-width:520px;border-radius:22px 22px 0 0;padding:10px 18px calc(24px + env(safe-area-inset-bottom));max-height:92dvh;overflow-y:auto;overscroll-behavior:contain;animation:trsobe .3s cubic-bezier(.2,.8,.2,1);}
@keyframes trsobe{from{transform:translateY(30px);}to{transform:translateY(0);}}
.trpuxador{width:40px;height:4px;border-radius:99px;background:var(--faint);margin:6px auto 14px;}
.trexcab{display:flex;gap:12px;align-items:center;margin-bottom:14px;}
.trexh{font-family:'Bricolage Grotesque',sans-serif;font-size:19px;font-weight:800;margin:0;letter-spacing:-.01em;line-height:1.15;}
.trexsub{font-size:12.5px;color:var(--mut);margin:3px 0 0;font-variant-numeric:tabular-nums;}
.trvidwrap{margin-bottom:14px;}
.trvid{width:100%;border-radius:16px;background:#0C1A33;aspect-ratio:1;object-fit:cover;box-shadow:0 14px 30px -14px rgba(12,26,51,.5);}
.trvidload{width:100%;aspect-ratio:1;border-radius:16px;background:#E2ECFC;display:flex;align-items:center;justify-content:center;color:var(--mut);font-size:13px;margin-bottom:14px;}
.trvidbtns{display:flex;gap:6px;margin-top:8px;}
.trvidb{flex:1;min-height:38px;border:1px solid var(--faint);background:#fff;border-radius:10px;font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:var(--mut);cursor:pointer;}
.trvidb.on{background:var(--az);border-color:var(--az);color:#fff;}
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
.trentrada{display:flex;gap:8px;padding-top:12px;margin-top:8px;border-top:1px solid var(--faint);}
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

@media (prefers-reduced-motion:reduce){.tr *,.tr *::before,.tr *::after{animation:none!important;transition:none!important;}}
@media (max-width:380px){.trescolhas{grid-template-columns:1fr;}.trmetav{font-size:17px;}}
`;
