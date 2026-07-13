import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);

// ─── Service worker ──────────────────────────────────────────────────────────
// Caminho absoluto e escopo explícito: com "sw.js" relativo, abrir o app numa
// rota funda faria o navegador procurar o arquivo na pasta errada e o registro
// falharia em silêncio.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Chegou versão nova enquanto o app estava aberto: assume na hora, sem
        // esperar a pessoa fechar todas as abas.
        reg.addEventListener("updatefound", () => {
          const novo = reg.installing;
          if (!novo) return;

          novo.addEventListener("statechange", () => {
            if (novo.state === "installed" && navigator.serviceWorker.controller) {
              novo.postMessage("assumir-agora");
            }
          });
        });
      })
      .catch((e) => console.warn("[linha] service worker não registrou:", e.message));

    // Quando o SW novo assume o comando, recarrega uma vez pra pegar o app novo.
    let recarregou = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recarregou) return;
      recarregou = true;
      window.location.reload();
    });
  });
}
