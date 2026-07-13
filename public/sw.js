// ─── Service worker do Linha ─────────────────────────────────────────────────
//
// O anterior fazia cache-first em TUDO que fosse GET. Isso causava dois estragos:
//
//   1. Cacheava /api/* — inclusive a resposta de sessão e o estado do usuário.
//      Duas pessoas no mesmo celular: a segunda receberia os dados da primeira,
//      servidos do cache. Vazamento de dados entre contas.
//
//   2. Cacheava o index.html. Depois de cada deploy o usuário ficava preso na
//      versão velha — e, pior, um index velho aponta para um asset com hash que
//      não existe mais no servidor: tela branca.
//
// Regra agora: a API nunca passa por aqui. A navegação é rede-primeiro. Só os
// assets com hash no nome (imutáveis por definição) são servidos direto do cache.

const VERSAO = "linha-v3";
const CASCA = `${VERSAO}-casca`;
const ASSETS = `${VERSAO}-assets`;

const ESSENCIAL = ["/", "/index.html", "/icon.svg", "/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CASCA)
      .then((c) => c.addAll(ESSENCIAL))
      .catch(() => {}) // um arquivo ausente não pode impedir o SW de instalar
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((k) => k !== CASCA && k !== ASSETS).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return; // nada de outros domínios

  // ── A API NUNCA entra no cache.
  // Uma resposta de /api/auth/eu ou /api/estado guardada aqui seria a rotina de
  // uma pessoa reaparecendo na conta de outra.
  if (url.pathname.startsWith("/api/")) return;

  // ── Navegação: rede primeiro.
  // Um deploy novo aparece na hora. O cache só entra quando não há rede — é o
  // que mantém o app abrindo no metrô e no avião.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CASCA).then((c) => c.put("/index.html", copia)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CASCA);
          return (await cache.match("/index.html")) || (await cache.match("/")) || Response.error();
        })
    );
    return;
  }

  // ── Assets com hash no nome (/assets/index-a1b2c3.js): para uma mesma URL o
  // conteúdo nunca muda, então servir do cache é sempre correto e instantâneo.
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const guardado = await cache.match(req);
        if (guardado) return guardado;

        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // ── Ícones e manifest: responde do cache pra ser rápido, mas busca a versão
  // nova por trás, pro próximo carregamento já vir atualizado.
  e.respondWith(
    caches.open(CASCA).then(async (cache) => {
      const guardado = await cache.match(req);

      const daRede = fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        })
        .catch(() => guardado);

      return guardado || daRede;
    })
  );
});

// A página pede pra trocar de versão sem esperar o próximo carregamento.
// Só aceita recado de uma página da própria origem.
self.addEventListener("message", (e) => {
  if (e.origin && e.origin !== self.location.origin) return;
  if (e.data === "assumir-agora") self.skipWaiting();
});
