import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import estatico from "@fastify/static";
import Fastify from "fastify";
import { COOKIE, limparSessoesVencidas, marcarUso, usuarioDaSessao } from "./auth.js";
import { migrar, pool } from "./db.js";
import { semearAdmin } from "./bootstrap.js";
import rotasAdmin from "./routes/admin.js";
import rotasAuth from "./routes/auth.js";
import rotasEstado from "./routes/estado.js";
import rotasTreino from "./routes/treino.js";
import rotasIA from "./routes/ia.js";
import { carregarDados } from "./treino.js";
import { IA_ATIVA } from "./ia.js";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIST = join(AQUI, "..", "dist");

const PROD = process.env.NODE_ENV === "production";
const PORTA = Number(process.env.PORT || 3000);

for (const obrigatoria of ["DATABASE_URL", "SESSION_SECRET"]) {
  if (!process.env[obrigatoria]) {
    console.error(`[boot] falta a variável de ambiente ${obrigatoria}. Abortando.`);
    process.exit(1);
  }
}
if (process.env.SESSION_SECRET.length < 32) {
  console.error("[boot] SESSION_SECRET precisa de pelo menos 32 caracteres. Abortando.");
  process.exit(1);
}

// Quantos proxies existem na frente. O EasyPanel poe UM (Traefik), entao 1.
// Com "true" o Fastify confiaria na cadeia INTEIRA de X-Forwarded-For, e ai um
// atacante forja o header, aparece como um IP novo a cada request e fura o rate
// limit do login. Confiar em N saltos fixos pega o IP real e ignora o que veio
// forjado a mais. Se um dia por Cloudflare na frente, suba pra 2.
const PROXIES = Number(process.env.TRUST_PROXY_HOPS || 1);

const app = Fastify({
  trustProxy: PROXIES,
  bodyLimit: 1024 * 1024, // 1 MB — o estado do app cabe folgado
  logger: PROD
    ? { level: "info" }
    : { level: "info", transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } } },
});

await app.register(cookie, { secret: process.env.SESSION_SECRET });

await app.register(rateLimit, {
  global: false,
  // O rate limit vive na memoria do processo. Se um dia rodar com mais de uma
  // replica no EasyPanel, trocar por store no Redis/Postgres.
  keyGenerator: (req) => req.ip,
  // Sem isto o cliente recebe "Erro 429" cru. Aqui vira uma frase que a pessoa entende.
  errorResponseBuilder: (req, ctx) => ({
    erro: `Muitas tentativas seguidas. Espera ${Math.ceil(ctx.ttl / 1000 / 60) || 1} minuto(s) e tenta de novo.`,
  }),
});

// ─── Anexa o usuario logado a cada request de /api ───────────────────────────
app.decorateRequest("usuario", null);

app.addHook("preHandler", async (req) => {
  if (!req.url.startsWith("/api/")) return;

  const token = req.cookies?.[COOKIE];
  if (!token) return;

  req.usuario = await usuarioDaSessao(token);
  if (req.usuario) {
    // Sem await: e so telemetria, nao vale segurar a resposta.
    marcarUso(token).catch(() => {});
  }
});

// ─── Anti-CSRF ───────────────────────────────────────────────────────────────
// O cookie e SameSite=Lax, o que ja barra POST cross-site. Esta checagem de
// Origin e a segunda tranca, para o caso de um navegador antigo.
app.addHook("preHandler", async (req, reply) => {
  if (!req.url.startsWith("/api/")) return;
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;

  const origin = req.headers.origin;
  if (!origin) return; // curl e apps nativos nao mandam Origin; o cookie ainda protege

  let vindoDe;
  try {
    vindoDe = new URL(origin).host;
  } catch {
    return reply.code(403).send({ erro: "Origem inválida." });
  }

  if (vindoDe !== req.headers.host) {
    req.log.warn({ origin, host: req.headers.host }, "CSRF barrado");
    return reply.code(403).send({ erro: "Origem não confere." });
  }
});

// ─── Rotas ───────────────────────────────────────────────────────────────────
app.get("/api/health", async () => {
  await pool.query("select 1");
  return { ok: true, em: new Date().toISOString() };
});

await app.register(rotasAuth, { prefix: "/api/auth" });
await app.register(rotasAdmin, { prefix: "/api/admin" });
await app.register(rotasEstado, { prefix: "/api" });
await app.register(rotasTreino, { prefix: "/api" });
await app.register(rotasIA, { prefix: "/api" });

app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith("/api/")) {
    return reply.code(404).send({ erro: "Rota não encontrada." });
  }
  // Qualquer outra rota e do app React (SPA). O index nunca pode ser cacheado,
  // senao o usuario fica preso numa versao velha depois do deploy.
  return reply.type("text/html").header("cache-control", "no-cache, must-revalidate").sendFile("index.html");
});

app.setErrorHandler((erro, req, reply) => {
  if (erro.statusCode && erro.statusCode < 500) {
    return reply.code(erro.statusCode).send({ erro: erro.message });
  }
  req.log.error(erro);
  // Nunca devolver stack trace pro cliente.
  return reply.code(500).send({ erro: "Deu erro aqui no servidor. Tenta de novo." });
});

// ─── Front-end compilado ─────────────────────────────────────────────────────
await app.register(estatico, {
  root: DIST,
  index: false,
  // Desligado de proposito: com cacheControl automatico, o @fastify/static
  // grava "max-age=0" DEPOIS do nosso setHeaders e vence. Aqui controlamos tudo.
  cacheControl: false,
  setHeaders(res, caminho) {
    // Assets tem hash no nome (index-a1b2c3.js): o conteudo nunca muda pra uma
    // mesma URL, entao pode ficar em cache pra sempre.
    if (caminho.includes("/assets/")) {
      res.setHeader("cache-control", "public, max-age=31536000, immutable");
      return;
    }
    // Estes tres NAO podem ser cacheados, senao o usuario fica preso numa versao
    // velha do app depois de todo deploy — com risco de tela branca.
    if (/(index\.html|sw\.js|manifest\.webmanifest)$/.test(caminho)) {
      res.setHeader("cache-control", "no-cache, must-revalidate");
      return;
    }
    res.setHeader("cache-control", "public, max-age=86400");
  },
});

app.get("/", async (req, reply) =>
  reply.type("text/html").header("cache-control", "no-cache, must-revalidate").sendFile("index.html")
);

// ─── Cabecalhos de seguranca ─────────────────────────────────────────────────
app.addHook("onSend", async (req, reply, payload) => {
  reply.header("x-content-type-options", "nosniff");
  reply.header("referrer-policy", "same-origin");
  reply.header("x-frame-options", "DENY");
  reply.header("permissions-policy", "geolocation=(), microphone=(), camera=()");

  // CSP: numa SPA autenticada, tranca o estrago que um XSS conseguiria fazer.
  // 'unsafe-inline' em style é necessário (o app injeta <style> e usa style=…);
  // as fontes do Google e as imagens data:/blob: (canvas do story) são liberadas
  // só onde precisam. Script só do próprio domínio — nada de inline.
  reply.header(
    "content-security-policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:", // vídeos de exercício (servidos pelo proxy, mesma origem)
      "connect-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join("; ")
  );

  if (PROD) {
    reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  if (req.url.startsWith("/api/") && !reply.getHeader("cache-control")) {
    // Nunca deixar resposta de API entrar em cache — MENOS quando a rota já
    // definiu o próprio cache-control (o vídeo de exercício, que é imutável e
    // pode ficar guardado uma semana). Sem o `!getHeader`, este no-store
    // sobrescreveria e o vídeo seria rebaixado a cada play.
    reply.header("cache-control", "no-store");
  }
  return payload;
});

// ─── Sobe ────────────────────────────────────────────────────────────────────
try {
  await migrar();
  await semearAdmin();
  await carregarDados(); // biblioteca de exercícios + alimentos na memória
  await limparSessoesVencidas();

  if (!IA_ATIVA()) {
    console.warn("[boot] OPENROUTER_API_KEY não definida: os chats de IA (personal/nutri) ficam desligados. O resto do treino funciona.");
  }

  // Faxina diaria nas sessoes vencidas. unref() pra nao segurar o processo no shutdown.
  setInterval(() => limparSessoesVencidas().catch(() => {}), 24 * 60 * 60 * 1000).unref();

  await app.listen({ port: PORTA, host: "0.0.0.0" });
  app.log.info(`Linha no ar na porta ${PORTA}`);
} catch (e) {
  console.error("[boot] falhou:", e);
  process.exit(1);
}

// Encerra limpo quando o EasyPanel manda parar (deploy, restart).
for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, async () => {
    app.log.info(`${sinal} recebido, encerrando...`);
    await app.close();
    await pool.end();
    process.exit(0);
  });
}
