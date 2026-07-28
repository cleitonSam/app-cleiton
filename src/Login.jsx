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
        <div className="authaurora" aria-hidden="true" />
        <div className="authgrao" aria-hidden="true" />
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
      <div className="authaurora" aria-hidden="true" />
      <div className="authgrao" aria-hidden="true" />

      <main className="authbox">
        <header className="authmarca">
          <div className="authfenix"><PhoenixMascot mood="cheer" /></div>
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
.authshell{position:relative;overflow:hidden;min-height:100dvh;background:radial-gradient(130% 120% at 50% 0%,#0A0A0A 0%,#0A0A0A 62%);display:flex;align-items:center;justify-content:center;padding:calc(24px + env(safe-area-inset-top)) 18px calc(24px + env(safe-area-inset-bottom));}
/* aurora que respira atrás do card + grão, pra tela de entrada não ser um degradê chapado */
.authaurora{position:absolute;inset:-20% -10% auto -10%;height:80%;z-index:0;pointer-events:none;
  background:radial-gradient(42% 40% at 26% 12%,rgba(110,110,115,.30),transparent 70%),radial-gradient(44% 42% at 80% 6%,rgba(10,10,10,.34),transparent 72%);
  filter:blur(6px);animation:authflutua 14s ease-in-out infinite;}
@keyframes authflutua{0%,100%{transform:translateY(0) scale(1);opacity:.9;}50%{transform:translateY(18px) scale(1.06);opacity:1;}}
.authgrao{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.4;mix-blend-mode:soft-light;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
.authbox{position:relative;z-index:1;width:100%;max-width:420px;animation:authsobe .5s cubic-bezier(.2,.8,.2,1);}
@keyframes authsobe{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}

.authmarca{display:flex;align-items:center;gap:12px;justify-content:center;margin-bottom:22px;}
.authfenix{display:inline-flex;animation:fenixflutua 3.6s ease-in-out infinite;}
@keyframes fenixflutua{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
.authmarca svg.phoenixsvg{width:56px;height:56px;filter:drop-shadow(0 8px 20px rgba(10,10,10,.55));}
.authmarcatxt{display:flex;flex-direction:column;line-height:1;}
.authbrand{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px;letter-spacing:-.02em;background:linear-gradient(100deg,#C9C7C2,#3A3A3E);-webkit-background-clip:text;background-clip:text;color:transparent;}
.authtag{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#9A9A9E;margin-top:5px;}

.authcard{position:relative;background:#fff;border-radius:22px;padding:24px 20px;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 24px 60px -20px rgba(10,10,10,.6),0 8px 20px -12px rgba(10,10,10,.4);}
.authcard-espera{text-align:center;display:flex;flex-direction:column;align-items:center;}
.authcard-espera svg.phoenixsvg{width:84px;height:84px;margin-bottom:6px;}

.authtabs{display:flex;gap:6px;background:#ECEAE6;padding:4px;border-radius:12px;margin-bottom:20px;}
.authtab{flex:1;min-height:44px;border:none;background:transparent;border-radius:9px;font-family:'Hanken Grotesk',sans-serif;font-size:14px;font-weight:600;color:#6E6E73;cursor:pointer;transition:background .15s,color .15s;}
.authtab-on{background:#fff;color:#0A0A0A;box-shadow:0 1px 3px rgba(10,10,10,.12);}

.authh{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;letter-spacing:-.02em;color:#0A0A0A;margin:8px 0 8px;}
.authp{font-size:14.5px;line-height:1.6;color:#6E6E73;margin:0 0 20px;}

.authlabel{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6E6E73;font-weight:600;margin:14px 0 6px;}
.authinput{width:100%;min-height:48px;border:1px solid #E4E2DE;border-radius:11px;padding:12px 13px;font-family:'Hanken Grotesk',sans-serif;font-size:16px;color:#0A0A0A;background:#fff;outline:none;}
.authinput:focus{border-color:#0A0A0A;box-shadow:0 0 0 3px rgba(10,10,10,.12);}

.authsenha{position:relative;}
/* O botão fica DENTRO do campo mas com 44px de altura: dá pra acertar com o polegar. */
.authsenha .authinput{padding-right:92px;}
.autholho{position:absolute;right:5px;top:50%;transform:translateY(-50%);min-height:44px;padding:0 12px;background:transparent;border:none;color:#0A0A0A;font-family:'Hanken Grotesk',sans-serif;font-size:12.5px;font-weight:600;cursor:pointer;}

.authdica{font-size:12.5px;color:#6E6E73;margin:8px 0 0;line-height:1.5;}

.autherro{margin:16px 0 0;background:#ECEAE6;border:1px solid #D8D6D0;border-radius:11px;padding:11px 13px;font-size:13.5px;line-height:1.5;color:#0A0A0A;font-weight:500;}

.authbtn{position:relative;overflow:hidden;width:100%;min-height:52px;margin-top:22px;background:linear-gradient(120deg,#2C2C30,#0A0A0A);color:#fff;border:none;border-radius:14px;font-family:'Hanken Grotesk',sans-serif;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 10px 24px -10px rgba(10,10,10,.7);transition:transform .12s,filter .15s,box-shadow .2s;}
.authbtn::after{content:"";position:absolute;top:0;left:-70%;width:45%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-18deg);animation:authshine 3.4s ease-in-out 1s infinite;}
@keyframes authshine{0%{left:-70%;}45%,100%{left:140%;}}
.authbtn:hover:not(:disabled){filter:brightness(1.06);box-shadow:0 14px 30px -10px rgba(10,10,10,.8);}
.authbtn:active:not(:disabled){transform:scale(.98);}
.authbtn:disabled{opacity:.6;cursor:default;}
.authbtn.ghost{background:transparent;border:1px solid #E4E2DE;color:#0A0A0A;box-shadow:none;}
.authbtn.ghost::after{display:none;}

.authaviso{font-size:12.5px;line-height:1.55;color:#6E6E73;text-align:center;margin:16px 2px 0;}

button:focus-visible,input:focus-visible{outline:2px solid #0A0A0A;outline-offset:2px;}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}}
`;
