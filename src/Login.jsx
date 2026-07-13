import React, { useEffect, useRef, useState } from "react";
import { api, semConexao } from "./api.js";
import PhoenixMascot from "./Fenix.jsx";

// Entrar / criar conta.
// Cadastro não dá acesso na hora: entra como "pendente" e o administrador libera.
// A tela conta isso ANTES da pessoa se cadastrar, pra ninguém ficar esperando sem saber.

export default function Login({ onEntrou }) {
  const [modo, setModo] = useState("entrar"); // entrar · cadastrar · aguardando
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const primeiroCampo = useRef(null);

  useEffect(() => {
    setErro(null);
  }, [modo]);

  // Ao trocar de aba, o foco vai pro primeiro campo — quem usa teclado ou leitor
  // de tela não fica perdido no meio da página.
  useEffect(() => {
    if (modo !== "aguardando") primeiroCampo.current?.focus();
  }, [modo]);

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;

    setErro(null);
    setEnviando(true);

    try {
      if (modo === "entrar") {
        const usuario = await api.entrar(email, senha);
        onEntrou(usuario);
      } else {
        await api.cadastrar(nome, email, senha);
        setModo("aguardando");
      }
    } catch (err) {
      if (semConexao(err)) {
        setErro("Sem internet. Confere a conexão e tenta de novo.");
      } else if (err.corpo?.motivo === "pendente") {
        setModo("aguardando");
      } else {
        setErro(err.message);
      }
    } finally {
      setEnviando(false);
    }
  };

  if (modo === "aguardando") {
    return (
      <div className="authshell">
        <style>{css}</style>
        <main className="authbox">
          <div className="authcard authcard-espera">
            <PhoenixMascot mood="soft" />
            <h1 className="authh">Falta um passo</h1>
            <p className="authp">
              Seu cadastro chegou. O administrador precisa liberar o seu acesso — assim que
              ele liberar, é só entrar com o mesmo e-mail e senha.
            </p>
            <button className="authbtn ghost" onClick={() => setModo("entrar")}>
              Voltar para a entrada
            </button>
          </div>
        </main>
      </div>
    );
  }

  const cadastrando = modo === "cadastrar";

  return (
    <div className="authshell">
      <style>{css}</style>

      <main className="authbox">
        <header className="authmarca">
          <PhoenixMascot mood="cheer" />
          <div className="authmarcatxt">
            <span className="authbrand">Linha</span>
            <span className="authtag">copiloto de rotina</span>
          </div>
        </header>

        <div className="authcard">
          {/* Duas abas, não dois links perdidos: fica óbvio onde você está. */}
          <div className="authtabs" role="tablist" aria-label="Entrar ou criar conta">
            <button
              role="tab"
              aria-selected={!cadastrando}
              className={"authtab" + (!cadastrando ? " authtab-on" : "")}
              onClick={() => setModo("entrar")}
              type="button"
            >
              Entrar
            </button>
            <button
              role="tab"
              aria-selected={cadastrando}
              className={"authtab" + (cadastrando ? " authtab-on" : "")}
              onClick={() => setModo("cadastrar")}
              type="button"
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={enviar} noValidate>
            {cadastrando && (
              <>
                <label className="authlabel" htmlFor="nome">Seu nome</label>
                <input
                  id="nome"
                  ref={primeiroCampo}
                  className="authinput"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como você quer ser chamado"
                  autoComplete="name"
                  enterKeyHint="next"
                  required
                />
              </>
            )}

            <label className="authlabel" htmlFor="email">E-mail</label>
            <input
              id="email"
              ref={cadastrando ? undefined : primeiroCampo}
              className="authinput"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              required
            />

            <label className="authlabel" htmlFor="senha">Senha</label>
            <div className="authsenha">
              <input
                id="senha"
                className="authinput"
                type={verSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={cadastrando ? "Pelo menos 10 caracteres" : "Sua senha"}
                autoComplete={cadastrando ? "new-password" : "current-password"}
                enterKeyHint="go"
                required
              />
              <button
                type="button"
                className="autholho"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Esconder a senha" : "Mostrar a senha"}
              >
                {verSenha ? "esconder" : "mostrar"}
              </button>
            </div>

            {cadastrando && (
              <p className="authdica">Use letras e números. Nada de "12345678".</p>
            )}

            {/* role=alert: o leitor de tela anuncia o erro assim que ele aparece. */}
            {erro && (
              <p className="autherro" role="alert">
                {erro}
              </p>
            )}

            <button className="authbtn" type="submit" disabled={enviando}>
              {enviando ? "Um instante…" : cadastrando ? "Criar minha conta" : "Entrar"}
            </button>
          </form>

          {cadastrando && (
            <p className="authaviso">
              A conta não abre sozinha: depois de criar, o administrador libera o seu acesso.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

const css = `
/* Sem isto os campos ficam content-box e o padding estoura a largura pra fora
   do card (o reset global do app não alcança esta tela). */
.authshell *{box-sizing:border-box;}
.authshell{min-height:100dvh;background:radial-gradient(130% 120% at 50% 0%,#1B3C77 0%,#0C1A33 62%);display:flex;align-items:center;justify-content:center;padding:calc(24px + env(safe-area-inset-top)) 18px calc(24px + env(safe-area-inset-bottom));}
.authbox{width:100%;max-width:420px;}

.authmarca{display:flex;align-items:center;gap:12px;justify-content:center;margin-bottom:22px;}
.authmarca svg.phoenixsvg{width:56px;height:56px;filter:drop-shadow(0 6px 18px rgba(15,181,199,.45));}
.authmarcatxt{display:flex;flex-direction:column;line-height:1;}
.authbrand{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px;letter-spacing:-.02em;background:linear-gradient(100deg,#7FE3EE,#5A94F2);-webkit-background-clip:text;background-clip:text;color:transparent;}
.authtag{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#7E93B8;margin-top:5px;}

.authcard{background:#fff;border-radius:18px;padding:22px 20px;box-shadow:0 18px 44px rgba(6,14,30,.42);}
.authcard-espera{text-align:center;display:flex;flex-direction:column;align-items:center;}
.authcard-espera svg.phoenixsvg{width:84px;height:84px;margin-bottom:6px;}

.authtabs{display:flex;gap:6px;background:#E2ECFC;padding:4px;border-radius:12px;margin-bottom:20px;}
.authtab{flex:1;min-height:44px;border:none;background:transparent;border-radius:9px;font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#5A6B87;cursor:pointer;transition:background .15s,color .15s;}
.authtab-on{background:#fff;color:#1F5FE6;box-shadow:0 1px 3px rgba(12,26,51,.12);}

.authh{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;letter-spacing:-.02em;color:#0C1A33;margin:8px 0 8px;}
.authp{font-size:14.5px;line-height:1.6;color:#5A6B87;margin:0 0 20px;}

.authlabel{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5A6B87;font-weight:600;margin:14px 0 6px;}
.authinput{width:100%;min-height:48px;border:1px solid #D6E0F0;border-radius:11px;padding:12px 13px;font-family:Inter,sans-serif;font-size:16px;color:#0C1A33;background:#fff;outline:none;}
.authinput:focus{border-color:#1F5FE6;box-shadow:0 0 0 3px rgba(31,95,230,.12);}

.authsenha{position:relative;}
/* O botão fica DENTRO do campo mas com 44px de altura: dá pra acertar com o polegar. */
.authsenha .authinput{padding-right:92px;}
.autholho{position:absolute;right:5px;top:50%;transform:translateY(-50%);min-height:44px;padding:0 12px;background:transparent;border:none;color:#1F5FE6;font-family:Inter,sans-serif;font-size:12.5px;font-weight:600;cursor:pointer;}

.authdica{font-size:12.5px;color:#5A6B87;margin:8px 0 0;line-height:1.5;}

.autherro{margin:16px 0 0;background:#FDECEC;border:1px solid #E9B4B1;border-radius:11px;padding:11px 13px;font-size:13.5px;line-height:1.5;color:#96322C;font-weight:500;}

.authbtn{width:100%;min-height:50px;margin-top:20px;background:linear-gradient(120deg,#0FB5C7,#1F5FE6);color:#fff;border:none;border-radius:12px;font-family:Inter,sans-serif;font-weight:700;font-size:15px;cursor:pointer;transition:transform .12s,filter .15s;}
.authbtn:hover:not(:disabled){filter:brightness(1.05);}
.authbtn:active:not(:disabled){transform:scale(.98);}
.authbtn:disabled{opacity:.6;cursor:default;}
.authbtn.ghost{background:transparent;border:1px solid #D6E0F0;color:#1F5FE6;}

.authaviso{font-size:12.5px;line-height:1.55;color:#5A6B87;text-align:center;margin:16px 2px 0;}

button:focus-visible,input:focus-visible{outline:2px solid #1F5FE6;outline-offset:2px;}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
`;
