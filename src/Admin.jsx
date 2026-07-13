import React, { useCallback, useEffect, useRef, useState } from "react";
import { api, semConexao } from "./api.js";

// ─── Painel do administrador ─────────────────────────────────────────────────
//
// A ideia visual vem do próprio app: no Linha, a "linha do dia" é um trilho onde
// você toca num nó e ele acende. Aqui é o mesmo gesto — cada pessoa é um nó no
// trilho. Nó apagado = esperando liberação. Nó aceso = com acesso.
// O estado do nó É a informação; não é enfeite.

const AGORA_NAO = { pendente: "Esperando liberação", ativo: "Com acesso", bloqueado: "Bloqueado" };

const dataCurta = (v) =>
  v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

const dataHora = (v) =>
  v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function Admin({ usuario, onVoltar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [resumo, setResumo] = useState({ pendentes: 0, ativos: 0, bloqueados: 0 });
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(null); // id em ação, pra travar o botão
  const [confirmando, setConfirmando] = useState(null); // id que pediu confirmação de exclusão
  const [criando, setCriando] = useState(false);
  const [aba, setAba] = useState("pessoas"); // pessoas · historico
  const [eventos, setEventos] = useState([]);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await api.usuarios({ status: filtro, busca });
      setUsuarios(r.usuarios);
      setResumo(r.resumo);
    } catch (e) {
      setErro(semConexao(e) ? "Sem internet." : e.message);
    } finally {
      setCarregando(false);
    }
  }, [filtro, busca]);

  useEffect(() => {
    // Espera a digitação parar antes de bater no servidor a cada tecla.
    const t = setTimeout(carregar, busca ? 300 : 0);
    return () => clearTimeout(t);
  }, [carregar, busca]);

  useEffect(() => {
    if (aba !== "historico") return;
    api.log().then((r) => setEventos(r.eventos)).catch(() => {});
  }, [aba]);

  const agir = async (id, fn, mensagem) => {
    setOcupado(id);
    setErro(null);
    setAviso(null);
    try {
      await fn();
      if (mensagem) setAviso(mensagem);
      setConfirmando(null);
      await carregar();
    } catch (e) {
      setErro(semConexao(e) ? "Sem internet." : e.message);
    } finally {
      setOcupado(null);
    }
  };

  const redefinir = (u) => {
    const nova = window.prompt(`Nova senha para ${u.nome} (mínimo 10 caracteres, com letra e número):`);
    if (!nova) return;
    agir(u.id, () => api.redefinirSenha(u.id, nova), `Senha de ${u.nome} redefinida. Passe a nova senha pra ela.`);
  };

  return (
    <div className="admshell">
      <style>{css}</style>

      <div className="admwrap">
        <header className="admhead">
          <div>
            <span className="admeye">Administração</span>
            <h1 className="admh1">Quem entra no Linha</h1>
          </div>
          <button className="admvoltar" onClick={onVoltar}>
            ← Meu dia
          </button>
        </header>

        {/* Os pendentes são o motivo de você abrir esta tela. Ficam em primeiro lugar. */}
        {resumo.pendentes > 0 && (
          <div className="admalerta">
            <strong>
              {resumo.pendentes} {resumo.pendentes === 1 ? "pessoa está esperando" : "pessoas estão esperando"}
            </strong>{" "}
            você liberar o acesso.
          </div>
        )}

        <div className="admtabs">
          <button className={"admtab" + (aba === "pessoas" ? " admtab-on" : "")} onClick={() => setAba("pessoas")}>
            Pessoas
          </button>
          <button className={"admtab" + (aba === "historico" ? " admtab-on" : "")} onClick={() => setAba("historico")}>
            Histórico
          </button>
        </div>

        {aba === "pessoas" ? (
          <>
            <div className="admnums">
              {[
                ["pendente", resumo.pendentes, "esperando"],
                ["ativo", resumo.ativos, "com acesso"],
                ["bloqueado", resumo.bloqueados, "bloqueadas"],
              ].map(([chave, n, rotulo]) => (
                <button
                  key={chave}
                  className={"admnum" + (filtro === chave ? " admnum-on" : "")}
                  onClick={() => setFiltro(filtro === chave ? "todos" : chave)}
                >
                  <span className={"admnumv admnumv-" + chave}>{n}</span>
                  <span className="admnuml">{rotulo}</span>
                </button>
              ))}
            </div>

            <div className="admbarra">
              <input
                className="admbusca"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                type="search"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <button className="admadd" onClick={() => setCriando(true)}>
                + Pessoa
              </button>
            </div>

            {erro && (
              <p className="admerro" role="alert">
                {erro}
              </p>
            )}
            {aviso && (
              <p className="admok" role="status">
                {aviso}
              </p>
            )}

            {carregando ? (
              <p className="admvazio">Carregando…</p>
            ) : !usuarios.length ? (
              <p className="admvazio">
                {busca || filtro !== "todos"
                  ? "Ninguém aqui com esse filtro."
                  : "Só você por enquanto. Quem se cadastrar aparece nesta lista."}
              </p>
            ) : (
              <div className="admtrilho">
                {usuarios.map((u, i) => {
                  const eu = u.id === usuario.id;
                  const ultimo = i === usuarios.length - 1;
                  const trabalhando = ocupado === u.id;

                  return (
                    <div key={u.id} className={"admlinha admlinha-" + u.status}>
                      {/* O trilho: o nó acende quando a pessoa tem acesso. */}
                      <div className="admrail">
                        <span className={"admfio" + (ultimo ? " admfio-fim" : "")} />
                        <span className={"admno admno-" + u.status}>{u.status === "ativo" ? "✓" : ""}</span>
                      </div>

                      <div className="admcorpo">
                        <div className="admtopo">
                          <span className="admnome">
                            {u.nome}
                            {eu && <span className="admvc">você</span>}
                            {u.role === "admin" && <span className="admadmin">admin</span>}
                          </span>
                          <span className={"admstatus admstatus-" + u.status}>{AGORA_NAO[u.status]}</span>
                        </div>

                        <p className="admemail">{u.email}</p>

                        <p className="admmeta">
                          entrou em {dataCurta(u.criado_em)}
                          {u.ultimo_login && <> · último acesso {dataCurta(u.ultimo_login)}</>}
                          {u.sessoes_ativas > 0 && (
                            <> · {u.sessoes_ativas} {u.sessoes_ativas === 1 ? "aparelho conectado" : "aparelhos conectados"}</>
                          )}
                        </p>

                        {confirmando === u.id ? (
                          <div className="admconfirma">
                            <p className="admconfirmatxt">
                              Apagar <strong>{u.nome}</strong> apaga junto todo o histórico dela: rotina, peso,
                              vitórias. Não tem como desfazer.
                            </p>
                            <div className="admacoes">
                              <button
                                className="admbtn perigo"
                                disabled={trabalhando}
                                onClick={() => agir(u.id, () => api.apagarUsuario(u.id), `${u.nome} foi apagado.`)}
                              >
                                Apagar mesmo assim
                              </button>
                              <button className="admbtn" onClick={() => setConfirmando(null)}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="admacoes">
                            {u.status === "pendente" && (
                              <button
                                className="admbtn liberar"
                                disabled={trabalhando}
                                onClick={() =>
                                  agir(u.id, () => api.mudarStatus(u.id, "ativo"), `${u.nome} agora tem acesso.`)
                                }
                              >
                                {trabalhando ? "…" : "Liberar acesso"}
                              </button>
                            )}

                            {u.status === "ativo" && !eu && (
                              <button
                                className="admbtn"
                                disabled={trabalhando}
                                onClick={() =>
                                  agir(
                                    u.id,
                                    () => api.mudarStatus(u.id, "bloqueado"),
                                    `${u.nome} foi bloqueado e desconectado.`
                                  )
                                }
                              >
                                Bloquear
                              </button>
                            )}

                            {u.status === "bloqueado" && (
                              <button
                                className="admbtn liberar"
                                disabled={trabalhando}
                                onClick={() =>
                                  agir(u.id, () => api.mudarStatus(u.id, "ativo"), `${u.nome} voltou a ter acesso.`)
                                }
                              >
                                Devolver o acesso
                              </button>
                            )}

                            {!eu && u.status === "ativo" && (
                              <button
                                className="admbtn"
                                disabled={trabalhando}
                                onClick={() =>
                                  agir(
                                    u.id,
                                    () => api.mudarRole(u.id, u.role === "admin" ? "user" : "admin"),
                                    u.role === "admin"
                                      ? `${u.nome} não é mais administrador.`
                                      : `${u.nome} agora é administrador.`
                                  )
                                }
                              >
                                {u.role === "admin" ? "Tirar de admin" : "Tornar admin"}
                              </button>
                            )}

                            <button className="admbtn" disabled={trabalhando} onClick={() => redefinir(u)}>
                              Redefinir senha
                            </button>

                            {!eu && (
                              <button className="admbtn perigo-fraco" onClick={() => setConfirmando(u.id)}>
                                Apagar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="admlog">
            {!eventos.length ? (
              <p className="admvazio">Nada registrado ainda.</p>
            ) : (
              eventos.map((ev) => (
                <div key={ev.id} className="admevento">
                  <span className="admeventodata">{dataHora(ev.em)}</span>
                  <span className="admeventoacao">{ev.acao}</span>
                  <span className="admeventoquem">
                    {ev.ator_nome ? `${ev.ator_nome}` : "sistema"}
                    {ev.alvo_nome && ev.alvo_nome !== ev.ator_nome && <> → {ev.alvo_nome}</>}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {criando && (
        <NovaPessoa
          onFechar={() => setCriando(false)}
          onCriou={(nome) => {
            setCriando(false);
            setAviso(`${nome} foi criado com acesso liberado.`);
            carregar();
          }}
        />
      )}
    </div>
  );
}

// ─── Criar alguém já com acesso ──────────────────────────────────────────────
// Atalho pra quando você quer dar acesso a alguém sem pedir que se cadastre e espere.
function NovaPessoa({ onFechar, onCriou }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [admin, setAdmin] = useState(false);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const primeiro = useRef(null);

  // Fechar clicando fora só serve pra quem tem mouse. No teclado, Esc é o caminho.
  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    primeiro.current?.focus();
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setErro(null);
    setEnviando(true);
    try {
      await api.criarUsuario({ nome, email, senha, role: admin ? "admin" : "user" });
      onCriou(nome);
    } catch (err) {
      setErro(semConexao(err) ? "Sem internet." : err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="admfundo" onClick={onFechar}>
      <div className="admfolha" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Criar pessoa">
        <div className="admpuxador" />
        <h2 className="admfolhah">Criar pessoa</h2>
        <p className="admfolhap">Ela já entra com o acesso liberado. Passe a senha pra ela depois.</p>

        <form onSubmit={enviar} noValidate>
          <label className="authlabel" htmlFor="np-nome">Nome</label>
          <input id="np-nome" ref={primeiro} className="authinput" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" required />

          <label className="authlabel" htmlFor="np-email">E-mail</label>
          <input
            id="np-email"
            className="authinput"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />

          <label className="authlabel" htmlFor="np-senha">Senha provisória</label>
          <input
            id="np-senha"
            className="authinput"
            type="text"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Pelo menos 10 caracteres, com letra e número"
            autoComplete="off"
            required
          />

          <label className="admcheck">
            <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} />
            <span>Também pode liberar o acesso de outras pessoas (admin)</span>
          </label>

          {erro && (
            <p className="admerro" role="alert">
              {erro}
            </p>
          )}

          <button className="authbtn" type="submit" disabled={enviando}>
            {enviando ? "Criando…" : "Criar com acesso liberado"}
          </button>
          <button className="admcancelar" type="button" onClick={onFechar}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}

const css = `
/* Mesmo reset da tela de login: sem ele os campos do formulário "criar pessoa"
   estouram a largura (o reset global do app não alcança esta tela). */
.admshell *{box-sizing:border-box;}
.admshell{min-height:100dvh;background:linear-gradient(180deg,#EFF4FD 0%,#E9EFFB 42%,#E5ECF8 100%);}
.admwrap{max-width:560px;margin:0 auto;padding:calc(24px + env(safe-area-inset-top)) 18px calc(40px + env(safe-area-inset-bottom));color:#0C1A33;font-family:Inter,system-ui,sans-serif;}

.admhead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px;}
.admeye{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#1F5FE6;font-weight:700;}
.admh1{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:800;letter-spacing:-.025em;margin:5px 0 0;}
.admvoltar{flex:none;min-height:44px;padding:0 14px;background:#fff;border:1px solid #D6E0F0;border-radius:11px;color:#1F5FE6;font-family:Inter,sans-serif;font-size:13.5px;font-weight:600;cursor:pointer;}

.admalerta{position:relative;overflow:hidden;background:linear-gradient(120deg,#1F5FE6,#0FB5C7);color:#fff;border-radius:14px;padding:13px 15px;font-size:14px;line-height:1.5;margin-bottom:18px;box-shadow:0 10px 24px -12px rgba(31,95,230,.8);}
.admalerta::after{content:"";position:absolute;top:0;left:-60%;width:45%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.4),transparent);transform:skewX(-18deg);animation:admvarre 3s ease-in-out .4s infinite;}
@keyframes admvarre{0%{left:-60%;}55%,100%{left:140%;}}

.admtabs{display:flex;gap:6px;background:#E2ECFC;padding:4px;border-radius:12px;margin-bottom:18px;}
.admtab{flex:1;min-height:44px;border:none;background:transparent;border-radius:9px;font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#5A6B87;cursor:pointer;}
.admtab-on{background:#fff;color:#1F5FE6;box-shadow:0 1px 3px rgba(12,26,51,.12);}

.admnums{display:flex;gap:8px;margin-bottom:14px;}
.admnum{flex:1;min-height:64px;background:#fff;border:1px solid #D6E0F0;border-radius:14px;padding:10px 6px;cursor:pointer;font-family:Inter,sans-serif;transition:border-color .15s,box-shadow .15s;}
.admnum-on{border-color:#1F5FE6;box-shadow:0 0 0 2px rgba(31,95,230,.14);}
.admnumv{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;line-height:1;}
.admnumv-pendente{color:#C98A24;}
.admnumv-ativo{color:#1F5FE6;}
.admnumv-bloqueado{color:#96322C;}
.admnuml{display:block;font-size:11px;color:#5A6B87;margin-top:5px;}

.admbarra{display:flex;gap:8px;margin-bottom:16px;}
.admbusca{flex:1;min-height:48px;border:1px solid #D6E0F0;border-radius:11px;padding:12px 13px;font-family:Inter,sans-serif;font-size:16px;color:#0C1A33;background:#fff;outline:none;}
.admbusca:focus{border-color:#1F5FE6;}
.admadd{flex:none;min-height:48px;padding:0 15px;background:#E2ECFC;border:1px solid rgba(31,95,230,.35);border-radius:11px;color:#1F5FE6;font-family:Inter,sans-serif;font-size:13.5px;font-weight:700;cursor:pointer;white-space:nowrap;}

.admerro{background:#FDECEC;border:1px solid #E9B4B1;border-radius:11px;padding:11px 13px;font-size:13.5px;color:#96322C;font-weight:500;margin:0 0 14px;}
.admok{background:#E2ECFC;border:1px solid rgba(31,95,230,.35);border-radius:11px;padding:11px 13px;font-size:13.5px;color:#1F5FE6;font-weight:600;margin:0 0 14px;}
.admvazio{text-align:center;color:#5A6B87;font-size:14px;line-height:1.6;padding:32px 12px;}

/* ── o trilho: cada pessoa é um nó. apagado = esperando. aceso = com acesso. */
.admtrilho{margin-top:4px;}
.admlinha{display:flex;gap:14px;}
.admrail{position:relative;width:26px;flex:none;display:flex;justify-content:center;}
.admfio{position:absolute;top:0;bottom:0;width:2px;background:#D6E0F0;}
.admfio-fim{bottom:50%;}
.admno{position:relative;margin-top:20px;width:28px;height:28px;border-radius:50%;border:2px solid #D6E0F0;background:#E9EFFB;z-index:2;color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;transition:background .3s,border-color .3s,box-shadow .3s;}
/* o nó pendente pulsa devagar — é ele que pede pra você liberar */
.admno-pendente{border-color:#C98A24;background:#F9EFD8;animation:noPulsa 2s ease-in-out infinite;}
@keyframes noPulsa{0%,100%{box-shadow:0 0 0 0 rgba(201,138,36,.4);}50%{box-shadow:0 0 0 6px rgba(201,138,36,0);}}
/* o nó aceso brilha, como um nó da linha do dia marcado */
.admno-ativo{background:linear-gradient(135deg,#1F5FE6,#0FB5C7);border-color:transparent;box-shadow:0 5px 14px -4px rgba(31,95,230,.7);}
.admno-bloqueado{border-color:#C0453F;background:#FDECEC;}

.admcorpo{flex:1;min-width:0;padding:14px 0 18px;}
.admtopo{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.admnome{font-size:15.5px;font-weight:700;color:#0C1A33;display:flex;align-items:center;gap:6px;}
.admvc{font-family:'Space Mono',monospace;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:#5A6B87;background:#E9EFFB;border:1px solid #D6E0F0;padding:2px 6px;border-radius:99px;}
.admadmin{font-family:'Space Mono',monospace;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:#1F5FE6;background:#E2ECFC;padding:2px 6px;border-radius:99px;}
.admstatus{margin-left:auto;font-size:11.5px;font-weight:600;}
.admstatus-pendente{color:#8A5E0E;}
.admstatus-ativo{color:#1F5FE6;}
.admstatus-bloqueado{color:#96322C;}
.admemail{font-size:13.5px;color:#5A6B87;margin:3px 0 0;word-break:break-all;}
.admmeta{font-family:'Space Mono',monospace;font-size:11px;color:#5A6B87;margin:6px 0 0;line-height:1.5;}

.admacoes{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px;}
.admbtn{min-height:40px;padding:0 13px;background:#fff;border:1px solid #D6E0F0;border-radius:10px;color:#0C1A33;font-family:Inter,sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:border-color .15s,transform .1s;}
.admbtn:hover:not(:disabled){border-color:#1F5FE6;color:#1F5FE6;}
.admbtn:active:not(:disabled){transform:scale(.97);}
.admbtn:disabled{opacity:.5;cursor:default;}
.admbtn.liberar{background:#1F5FE6;border-color:#1F5FE6;color:#fff;}
.admbtn.liberar:hover:not(:disabled){filter:brightness(1.08);color:#fff;}
.admbtn.perigo{background:#C0453F;border-color:#C0453F;color:#fff;}
.admbtn.perigo-fraco{color:#C0453F;border-color:#E9B4B1;}
.admbtn.perigo-fraco:hover{border-color:#C0453F;color:#C0453F;}

.admconfirma{margin-top:11px;background:#FDECEC;border:1px solid #E9B4B1;border-radius:12px;padding:12px 13px;}
.admconfirmatxt{font-size:13px;line-height:1.55;color:#96322C;margin:0 0 10px;}
.admconfirma .admacoes{margin-top:0;}

.admlog{display:flex;flex-direction:column;gap:2px;}
.admevento{display:flex;gap:10px;align-items:baseline;background:#fff;border:1px solid #D6E0F0;border-radius:10px;padding:10px 12px;flex-wrap:wrap;}
.admeventodata{font-family:'Space Mono',monospace;font-size:11px;color:#5A6B87;flex:none;}
.admeventoacao{font-family:'Space Mono',monospace;font-size:11.5px;color:#1F5FE6;font-weight:700;}
.admeventoquem{font-size:12.5px;color:#0C1A33;margin-left:auto;}

.admfundo{position:fixed;inset:0;background:rgba(12,26,51,.55);display:flex;align-items:flex-end;justify-content:center;z-index:50;}
.admfolha{background:#E9EFFB;width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:10px 20px calc(26px + env(safe-area-inset-bottom));max-height:92dvh;overflow-y:auto;overscroll-behavior:contain;}
.admpuxador{width:40px;height:4px;border-radius:99px;background:#D6E0F0;margin:8px auto 14px;}
.admfolhah{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;margin:0 0 6px;}
.admfolhap{font-size:13.5px;line-height:1.55;color:#5A6B87;margin:0 0 6px;}
.admcheck{display:flex;gap:10px;align-items:flex-start;margin-top:16px;font-size:13.5px;line-height:1.5;color:#0C1A33;cursor:pointer;}
.admcheck input{width:20px;height:20px;flex:none;margin-top:1px;accent-color:#1F5FE6;}
.admcancelar{width:100%;min-height:48px;background:transparent;border:none;color:#5A6B87;margin-top:6px;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;}

/* O formulário de "criar pessoa" usa os mesmos campos do login. O <style> do
   Login não está montado nesta tela, então as regras precisam existir aqui também. */
.authlabel{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5A6B87;font-weight:600;margin:14px 0 6px;}
.authinput{width:100%;min-height:48px;border:1px solid #D6E0F0;border-radius:11px;padding:12px 13px;font-family:Inter,sans-serif;font-size:16px;color:#0C1A33;background:#fff;outline:none;}
.authinput:focus{border-color:#1F5FE6;box-shadow:0 0 0 3px rgba(31,95,230,.12);}
.authbtn{width:100%;min-height:50px;margin-top:20px;background:linear-gradient(120deg,#0FB5C7,#1F5FE6);color:#fff;border:none;border-radius:12px;font-family:Inter,sans-serif;font-weight:700;font-size:15px;cursor:pointer;transition:filter .15s,transform .12s;}
.authbtn:hover:not(:disabled){filter:brightness(1.05);}
.authbtn:active:not(:disabled){transform:scale(.98);}
.authbtn:disabled{opacity:.6;cursor:default;}

button:focus-visible,input:focus-visible{outline:2px solid #1F5FE6;outline-offset:2px;}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}}
`;
