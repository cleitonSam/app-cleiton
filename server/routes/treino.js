import { exigeLogin } from "../guards.js";
import { pegarVideo } from "../video.js";
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

      // Baixa (ou pega do cache) o vídeo inteiro. Precisa dele todo na mão pra
      // responder Range: o iPhone/Safari só toca <video> quando o servidor
      // devolve 206 + Content-Range. Servir 200 inteiro faz o vídeo não abrir no iOS.
      let buf;
      try {
        buf = await pegarVideo(alvo.href);
      } catch {
        return reply.code(502).send({ erro: "Não consegui carregar o vídeo." });
      }

      reply.header("accept-ranges", "bytes");
      reply.header("content-type", "video/mp4");
      reply.header("cache-control", "public, max-age=604800");

      const range = req.headers.range;
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let inicio = m && m[1] ? Number(m[1]) : 0;
        let fim = m && m[2] ? Number(m[2]) : buf.length - 1;
        // faixa inválida → 416
        if (Number.isNaN(inicio) || Number.isNaN(fim) || inicio > fim || inicio >= buf.length) {
          reply.header("content-range", `bytes */${buf.length}`);
          return reply.code(416).send();
        }
        fim = Math.min(fim, buf.length - 1);
        reply.header("content-range", `bytes ${inicio}-${fim}/${buf.length}`);
        return reply.code(206).send(buf.subarray(inicio, fim + 1));
      }

      return reply.code(200).send(buf);
    }
  );
}
