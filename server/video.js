import { spawn } from "node:child_process";

// ─── Cache + download de vídeo de exercício ───────────────────────────────────
//
// Por que buffer + cache e não streaming direto:
//   1. O iPhone (Safari) só toca <video> se o servidor responder a "Range"
//      requests com 206 + Content-Range. Pra fatiar o arquivo, preciso dele
//      inteiro na mão. Os clipes são pequenos (~1 MB), então cabe de sobra.
//   2. O CDN do MuscleWiki bloqueia o fetch do Node (Cloudflare/TLS), mas deixa
//      passar o wget com os cabeçalhos de navegador. Então baixo com wget.
//   3. Guardado em memória, o mesmo vídeo não é rebaixado a cada play.

const CACHE = new Map(); // url -> { buf, em }
const MAX_ITENS = 120; // ~120 clipes de ~1 MB = ~120 MB no pior caso
const baixando = new Map(); // url -> Promise (evita baixar o mesmo 2x ao mesmo tempo)

function guardar(url, buf) {
  CACHE.set(url, { buf, em: Date.now() });
  // descarta o mais antigo quando estoura (LRU simples pela ordem de inserção)
  if (CACHE.size > MAX_ITENS) {
    const maisVelho = CACHE.keys().next().value;
    CACHE.delete(maisVelho);
  }
}

function baixarComWget(url) {
  return new Promise((resolve, reject) => {
    const wget = spawn("/usr/bin/wget", [
      "-q",
      "-O",
      "-",
      "--timeout=20",
      "--tries=2",
      "--header=User-Agent: Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "--header=Referer: https://musclewiki.com/",
      url,
    ]);
    const partes = [];
    let tam = 0;
    wget.stdout.on("data", (c) => {
      partes.push(c);
      tam += c.length;
      if (tam > 25 * 1024 * 1024) { // trava de segurança: nenhum clipe passa de 25 MB
        wget.kill("SIGKILL");
        reject(new Error("vídeo grande demais"));
      }
    });
    wget.on("error", reject);
    wget.on("close", (code) => {
      if (code !== 0 || tam === 0) return reject(new Error(`wget saiu ${code}`));
      resolve(Buffer.concat(partes, tam));
    });
  });
}

/** Devolve o Buffer do vídeo (do cache, ou baixando). */
export async function pegarVideo(url) {
  const emCache = CACHE.get(url);
  if (emCache) return emCache.buf;

  if (baixando.has(url)) return baixando.get(url); // já tem alguém baixando

  const p = baixarComWget(url)
    .then((buf) => {
      guardar(url, buf);
      baixando.delete(url);
      return buf;
    })
    .catch((e) => {
      baixando.delete(url);
      throw e;
    });

  baixando.set(url, p);
  return p;
}
