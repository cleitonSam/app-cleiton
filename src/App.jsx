import React, { useCallback, useEffect, useState } from "react";
import Admin from "./Admin.jsx";
import { api, semConexao } from "./api.js";
import { limpar } from "./armazenamento.js";
import Linha from "./Linha.jsx";
import Login from "./Login.jsx";

// O portão do app. Decide o que a pessoa vê: a entrada, o dia dela, ou o painel.

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [conferindo, setConferindo] = useState(true);
  const [tela, setTela] = useState("app"); // app · admin

  // Ao abrir, pergunta ao servidor quem está logado. O cookie é httpOnly, então
  // o JavaScript não tem como saber sozinho — só o servidor pode responder.
  useEffect(() => {
    let vivo = true;
    api
      .eu()
      .then((u) => vivo && setUsuario(u))
      .catch((e) => {
        // Sem internet, mas com sessão? Não dá pra confirmar. A pessoa entra de
        // novo quando a rede voltar; é o preço de não confiar num dado local.
        if (!semConexao(e)) return;
      })
      .finally(() => vivo && setConferindo(false));
    return () => {
      vivo = false;
    };
  }, []);

  const sair = useCallback(async () => {
    const id = usuario?.id;
    try {
      await api.sair();
    } catch {
      /* mesmo se a chamada falhar, saímos daqui */
    }
    // Limpa os dados deste usuário do aparelho: ninguém deve encontrar a rotina
    // de outra pessoa depois que ela sai.
    limpar(id);
    setUsuario(null);
    setTela("app");
  }, [usuario?.id]);

  if (conferindo) {
    return (
      <div style={carregandoShell}>
        <span style={carregandoTxt}>Abrindo o Linha…</span>
      </div>
    );
  }

  if (!usuario) {
    return <Login onEntrou={setUsuario} />;
  }

  if (tela === "admin" && usuario.role === "admin") {
    return <Admin usuario={usuario} onVoltar={() => setTela("app")} />;
  }

  return (
    <Linha
      usuario={usuario}
      onSair={sair}
      onAdmin={usuario.role === "admin" ? () => setTela("admin") : null}
    />
  );
}

const carregandoShell = {
  minHeight: "100dvh",
  background: "linear-gradient(180deg,#EFF4FD 0%,#E9EFFB 42%,#E5ECF8 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const carregandoTxt = {
  color: "#5A6B87",
  fontFamily: "Inter,system-ui,sans-serif",
  fontSize: 15,
};
