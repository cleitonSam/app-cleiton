import { spawn } from "node:child_process";
import { exigeLogin } from "../guards.js";
import {
  buscarAlimentos,
  buscarExercicio,
  exercicioPorId,
  gerarPlano,
  grupos,
  listarGrupo,
} from "../treino.js";

// Só domínios de vídeo confiáveis podem ser proxiados (trava anti-SSRF: sem isso,
// alguém pediria /api/treino/video?u=http://169.254.169.254/... e o servidor
// buscaria metadados internos da nuvem).
const HOSTS_VIDEO = new Set(["media.musclewiki.com"]);

export default async function rotasTreino(app) {
  app.addHook("preHandler", exigeLogin);

  // ─── Biblioteca ─────────────────────────────────────────────────────────────
  app.get("/treino/grupos", async () => ({ grupos: grupos() }));

  app.get(
    "/treino/exercicios",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            grupo: { type: "string", maxLength: 40 },
            busca: { type: "string", maxLength: 60 },
            nivel: { type: "string", enum: ["Iniciante", "Intermediário", "Avançado"] },
          },
        },
      },
    },
    async (req) => {
      const { grupo, busca, nivel } = req.query;
      if (busca) return { exercicios: buscarExercicio(busca) };
      if (grupo) return { exercicios: listarGrupo(grupo, { nivel }) };
      return { exercicios: [] };
    }
  );

  app.get("/treino/exercicio/:id", async (req, reply) => {
    const e = exercicioPorId(req.params.id);
    if (!e) return reply.code(404).send({ erro: "Exercício não encontrado." });
    // devolve o vídeo já apontando pro proxy (o navegador nunca fala com o MuscleWiki)
    return {
      ...e,
      videos: e.videos.map((u) => `/api/treino/video?u=${encodeURIComponent(u)}`),
    };
  });

  // ─── Gerar plano a partir da anamnese ───────────────────────────────────────
  app.post(
    "/treino/gerar",
    {
      schema: {
        body: {
          type: "object",
          properties: { anamnese: { type: "object" } },
          required: ["anamnese"],
        },
      },
    },
    async (req) => ({ plano: gerarPlano(req.body.anamnese) })
  );

  // ─── Alimentos ──────────────────────────────────────────────────────────────
  app.get(
    "/nutri/alimentos",
    {
      schema: { querystring: { type: "object", properties: { q: { type: "string", maxLength: 60 } } } },
    },
    async (req) => ({ alimentos: buscarAlimentos(req.query.q) })
  );

  // ─── Proxy de vídeo do MuscleWiki ───────────────────────────────────────────
  // O CDN bloqueia hotlink (403 sem o Referer certo). O servidor busca com os
  // cabeçalhos corretos e repassa o stream. Assim a CSP do app continua fechada
  // (o vídeo vem da própria origem) e a chave/segredo de ninguém é exposta.
  app.get(
    "/treino/video",
    {
      schema: { querystring: { type: "object", required: ["u"], properties: { u: { type: "string", maxLength: 400 } } } },
    },
    async (req, reply) => {
      let alvo;
      try {
        alvo = new URL(req.query.u);
      } catch {
        return reply.code(400).send({ erro: "URL inválida." });
      }
      if (alvo.protocol !== "https:" || !HOSTS_VIDEO.has(alvo.hostname)) {
        return reply.code(403).send({ erro: "Origem de vídeo não permitida." });
      }

      // Só .mp4 (a biblioteca é toda mp4). Fecha a porta pra qualquer outra coisa.
      if (!alvo.pathname.toLowerCase().endsWith(".mp4")) {
        return reply.code(403).send({ erro: "Só vídeo mp4." });
      }

      // Por que wget e não fetch: o Cloudflare do MuscleWiki bloqueia o fingerprint
      // TLS do fetch do Node (403), mas deixa passar o wget. O wget já está na
      // imagem (uso no healthcheck). Passo a URL como argumento (array, sem shell),
      // então não há injeção — e o host já foi validado acima.
      reply.hijack(); // assumimos o controle do stream; o Fastify não mexe mais
      const res = reply.raw;
      res.setHeader("content-type", "video/mp4");
      res.setHeader("cache-control", "public, max-age=604800");

      // Caminho absoluto (não depende do PATH) — o pacote wget do Alpine instala aqui.
      const wget = spawn("/usr/bin/wget", [
        "-q",
        "-O",
        "-",
        "--timeout=15",
        "--tries=1",
        "--header=User-Agent: Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "--header=Referer: https://musclewiki.com/",
        alvo.href,
      ]);

      let algumByte = false;
      wget.stdout.on("data", () => (algumByte = true));
      wget.stdout.pipe(res);

      wget.on("error", () => {
        if (!res.headersSent && !algumByte) res.statusCode = 502;
        res.end();
      });
      wget.on("close", (code) => {
        if (code !== 0 && !algumByte) {
          res.statusCode = 502;
        }
        res.end();
      });
      // Cliente desistiu (fechou a aba, trocou de exercício): mata o wget.
      req.raw.on("close", () => wget.kill("SIGKILL"));
      return reply;
    }
  );
}
