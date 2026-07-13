import { useCallback, useEffect, useRef, useState } from "react";
import { api, ErroApi, semConexao } from "./api.js";
import { gravar, ler } from "./armazenamento.js";
import { estadoPadrao, fundir, iso, normalizar, virarODia } from "./estado.js";

const ESPERA_ENVIO = 2000; // junta várias marcações seguidas num envio só

/**
 * Dono do estado do Linha: junta o que está no aparelho com o que está no servidor.
 *
 * O aparelho é quem responde rápido (grava na hora, funciona sem internet).
 * O servidor é a memória longa (o que te devolve o histórico num celular novo).
 * Quando os dois divergem, `fundir` junta os dois — nunca escolhe um e descarta o outro.
 */
export function useEstadoSincronizado(usuario) {
  const [s, setEstado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [situacao, setSituacao] = useState({ enviando: false, offline: false, erroLocal: null, em: null });

  const versao = useRef(0); // versão do servidor sobre a qual estamos editando
  const ultimoEnviado = useRef(""); // evita reenviar algo idêntico ao que já subiu
  const timer = useRef(null);
  const vivo = useRef(true);

  // Toda alteração carimba a hora. É esse carimbo que a fusão usa pra saber
  // qual aparelho falou por último.
  const setS = useCallback((proximo) => {
    setEstado((antes) => {
      if (!antes) return antes;
      const v = typeof proximo === "function" ? proximo(antes) : proximo;
      if (!v) return antes;
      return { ...v, atualizadoEm: Date.now() };
    });
  }, []);

  // ─── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!usuario) return;
    vivo.current = true;
    setCarregando(true);

    (async () => {
      const local = ler(usuario.id).estado;

      let doServidor = null;
      let offline = false;
      try {
        const r = await api.puxarEstado();
        versao.current = r?.versao || 0;
        doServidor = r?.data ? normalizar(r.data) : null;
      } catch (e) {
        if (semConexao(e)) offline = true;
        else console.error("[sync] não consegui puxar do servidor:", e.message);
      }

      if (!vivo.current) return;

      // Os dois lados existem? Junta. Só um? Usa esse. Nenhum? Usuário novo.
      let inicial;
      if (local && doServidor) inicial = fundir(local, doServidor);
      else inicial = doServidor || local || estadoPadrao();

      inicial = virarODia(inicial);

      setEstado(inicial);
      setSituacao((x) => ({ ...x, offline }));
      setCarregando(false);

      // O servidor está atrasado em relação ao que juntamos? Sobe agora.
      if (!offline && JSON.stringify(inicial) !== JSON.stringify(doServidor)) {
        enviar(inicial);
      }
    })();

    return () => {
      vivo.current = false;
      clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  // ─── Envio pro servidor ────────────────────────────────────────────────────
  const enviar = useCallback(
    async (estado) => {
      if (!estado || !usuario) return;

      const texto = JSON.stringify(estado);
      if (texto === ultimoEnviado.current) return; // nada mudou desde o último envio

      setSituacao((x) => ({ ...x, enviando: true }));

      try {
        const r = await api.salvarEstado(estado, versao.current);
        versao.current = r.versao;
        ultimoEnviado.current = texto;
        setSituacao({ enviando: false, offline: false, erroLocal: null, em: Date.now() });
      } catch (e) {
        if (semConexao(e)) {
          // Sem internet: o dado já está salvo no aparelho. Sobe quando voltar.
          setSituacao((x) => ({ ...x, enviando: false, offline: true }));
          return;
        }

        if (e instanceof ErroApi && e.status === 409) {
          // Outro aparelho salvou no meio do caminho. O servidor devolveu a versão
          // dele; juntamos as duas e mandamos de novo. Nada é descartado.
          const doServidor = e.corpo?.data ? normalizar(e.corpo.data) : null;
          versao.current = e.corpo?.versao || 0;
          if (!vivo.current) return;

          // Funde contra o estado ATUAL, não contra `estado` (o snapshot que subiu):
          // durante a ida à rede o usuário pode ter marcado mais coisas, e o
          // snapshot velho as apagaria.
          setEstado((atual) => virarODia(fundir(atual || estado, doServidor)));
          ultimoEnviado.current = ""; // força o reenvio do resultado da fusão
          setSituacao((x) => ({ ...x, enviando: false }));
          return;
        }

        console.error("[sync] falha ao salvar no servidor:", e.message);
        setSituacao((x) => ({ ...x, enviando: false }));
      }
    },
    [usuario]
  );

  // ─── Grava local na hora, servidor com calma ───────────────────────────────
  useEffect(() => {
    if (!s || carregando || !usuario) return;

    const r = gravar(usuario.id, s);
    setSituacao((x) => (x.erroLocal === (r.ok ? null : r.motivo) ? x : { ...x, erroLocal: r.ok ? null : r.motivo }));

    clearTimeout(timer.current);
    timer.current = setTimeout(() => enviar(s), ESPERA_ENVIO);

    return () => clearTimeout(timer.current);
  }, [s, carregando, usuario, enviar]);

  // ─── Virada de meia-noite com o app aberto ─────────────────────────────────
  // O app fica dias aberto no celular. Sem isso, o dia de ontem seguia sendo
  // "hoje": re-marcar uma vitória depois da meia-noite dava +1 na sequência e
  // +20 XP de graça, e o dia de ontem nunca ia parar no histórico.
  useEffect(() => {
    if (!s) return;

    const conferir = () => {
      setEstado((x) => {
        if (!x || x.currentDate === iso()) return x; // ainda é o mesmo dia: nada a fazer
        return virarODia(x);
      });
    };

    const id = setInterval(conferir, 60_000);
    document.addEventListener("visibilitychange", conferir);
    window.addEventListener("focus", conferir);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", conferir);
      window.removeEventListener("focus", conferir);
    };
  }, [!!s]);

  // ─── Voltou a internet: sobe o que ficou pra trás ──────────────────────────
  useEffect(() => {
    const aoVoltar = () => {
      setSituacao((x) => ({ ...x, offline: false }));
      setEstado((x) => {
        if (x) enviar(x);
        return x;
      });
    };
    window.addEventListener("online", aoVoltar);
    return () => window.removeEventListener("online", aoVoltar);
  }, [enviar]);

  // ─── Outra aba do mesmo navegador mexeu no estado ──────────────────────────
  // Duas abas abertas gravavam por cima uma da outra sem perceber.
  useEffect(() => {
    if (!usuario) return;

    const aoMudarArmazenamento = (e) => {
      if (e.key !== `linha:u:${usuario.id}` || !e.newValue) return;
      try {
        const daOutraAba = normalizar(JSON.parse(e.newValue));
        setEstado((x) => (x ? fundir(x, daOutraAba) : daOutraAba));
      } catch {
        /* ignora lixo */
      }
    };

    window.addEventListener("storage", aoMudarArmazenamento);
    return () => window.removeEventListener("storage", aoMudarArmazenamento);
  }, [usuario?.id]);

  // Sobe o que estiver pendente antes de fechar a aba.
  useEffect(() => {
    const aoSair = () => {
      if (!s || !usuario) return;
      const texto = JSON.stringify(s);
      if (texto === ultimoEnviado.current) return;
      // keepalive: o navegador termina de mandar mesmo com a aba fechando.
      try {
        fetch("/api/estado", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data: s, baseVersao: versao.current }),
          credentials: "same-origin",
          keepalive: true,
        });
      } catch {
        /* melhor esforço */
      }
    };
    window.addEventListener("pagehide", aoSair);
    return () => window.removeEventListener("pagehide", aoSair);
  }, [s, usuario]);

  const sincronizarAgora = useCallback(() => {
    clearTimeout(timer.current);
    if (s) enviar(s);
  }, [s, enviar]);

  return { s, setS, setEstado, carregando, situacao, sincronizarAgora };
}
