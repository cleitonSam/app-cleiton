import { exigeLogin } from "../guards.js";
import { conversar, IA_ATIVA } from "../ia.js";
import { calcularNutricao, indiceParaIA } from "../treino.js";

// ─── Personas ─────────────────────────────────────────────────────────────────

function promptPersonal(anamnese, plano) {
  const lesoes = anamnese?.lesoes ? `Lesões/limitações: ${anamnese.lesoes}. RESPEITE isso — nunca prescreva algo que agrave.` : "Sem lesões relatadas.";
  const parqAlerta = anamnese?.parqSim
    ? "ATENÇÃO: o aluno marcou SIM em pelo menos uma pergunta de triagem de saúde (PAR-Q). Recomende liberação médica antes de treinos intensos e seja conservador."
    : "";
  const planoTxt = plano?.treinos?.length
    ? `Plano atual (${plano.divisao}, ${plano.frequencia}x/semana):\n` +
      plano.treinos.map((t) => `${t.nome} (${t.foco}): ${t.exercicios.map((e) => e.nome).join(", ")}`).join("\n")
    : "O aluno ainda não tem plano montado.";

  return `Você é o personal trainer do app Linha. Fala em português do Brasil, jeito direto, prático e motivador, como um bom personal de academia — técnico mas sem enrolação. Respostas curtas e acionáveis.

PERFIL DO ALUNO
Objetivo: ${anamnese?.objetivo || "não informado"}
Nível: ${anamnese?.nivel || "iniciante"}
Frequência: ${anamnese?.frequencia || "?"}x por semana · tempo por treino: ${anamnese?.tempo || "?"}
Onde treina: ${(anamnese?.equipamentos || []).join(", ") || "academia"}
${lesoes}
${parqAlerta}

${planoTxt}

BIBLIOTECA DE EXERCÍCIOS DISPONÍVEIS (só sugira exercícios QUE ESTÃO nesta lista, com o nome exato — o app tem o vídeo de cada um):
${indiceParaIA()}

REGRAS
- Só recomende exercícios da biblioteca acima, pelo nome exato.
- Hipertrofia/ganho de massa: 8–12 reps, 3–4 séries, descanso 60–90s. Emagrecimento: 12–15 reps, descanso curto, some cardio. Força: 4–6 reps, descanso 2–3 min.
- Volume alvo por grupo: 10–20 séries por semana.
- Se o aluno tem lesão ou marcou PAR-Q, priorize segurança e sugira acompanhamento presencial.
- Você não substitui avaliação médica. Para dor persistente ou condição de saúde, oriente procurar um profissional.
- Seja objetivo. Use listas curtas quando ajudar. Nada de textão.`;
}

function promptNutri(anamnese) {
  const n = calcularNutricao(anamnese || {});
  return `Você é o nutricionista do app Linha. Fala em português do Brasil, acolhedor e prático. Monta planos alimentares realistas com comida brasileira de verdade.

PERFIL DO ALUNO
Objetivo: ${n.objetivo} (${n.referencia})
Peso: ${anamnese?.peso || "?"} kg · altura: ${anamnese?.altura || "?"} cm · idade: ${anamnese?.idade || "?"} · sexo: ${anamnese?.sexo || "?"}
Restrições alimentares: ${anamnese?.restricoesAlimentares || "nenhuma informada"}

METAS JÁ CALCULADAS (use estes números como base)
Gasto energético estimado (TDEE): ${n.tdee} kcal/dia
Meta calórica: ${n.kcalMeta} kcal/dia
Proteína: ${n.macros.prot} g · Carboidrato: ${n.macros.carb} g · Gordura: ${n.macros.gord} g

REGRAS
- Baseie o plano nas metas acima. Se o objetivo é ganhar peso, é superávit; se é emagrecer, é déficit — mantenha a proteína alta nos dois casos.
- Sugira alimentos comuns e acessíveis no Brasil (arroz, feijão, ovo, frango, carne, aveia, banana, batata, pão, leite, iogurte, whey, castanhas...).
- Distribua em refeições (café, lanche, almoço, lanche, jantar, ceia) com quantidades em gramas/medidas caseiras.
- Respeite as restrições alimentares informadas.
- Você não substitui um nutricionista presencial. Para condição de saúde (diabetes, etc.), oriente acompanhamento profissional.
- Seja prático e claro. Pode usar tabelas simples.`;
}

// ─── SSE helper ───────────────────────────────────────────────────────────────
function abrirSSE(reply) {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
}
const enviar = (reply, evento, dado) => reply.raw.write(`event: ${evento}\ndata: ${JSON.stringify(dado)}\n\n`);

export default async function rotasIA(app) {
  app.addHook("preHandler", exigeLogin);

  app.get("/ia/status", async () => ({ ativa: IA_ATIVA() }));

  app.post(
    "/ia/:agente",
    {
      // IA custa dinheiro: limita por usuário/IP.
      config: { rateLimit: { max: 30, timeWindow: "5 minutes" } },
      schema: {
        params: { type: "object", properties: { agente: { type: "string", enum: ["personal", "nutri"] } } },
        body: {
          type: "object",
          required: ["mensagens"],
          properties: {
            mensagens: {
              type: "array",
              maxItems: 24,
              items: {
                type: "object",
                required: ["role", "content"],
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string", maxLength: 4000 },
                },
              },
            },
            anamnese: { type: "object" },
            plano: { type: "object" },
          },
        },
      },
    },
    async (req, reply) => {
      if (!IA_ATIVA()) {
        return reply.code(503).send({ erro: "A IA ainda não foi ligada neste servidor." });
      }

      const { agente } = req.params;
      const { mensagens, anamnese, plano } = req.body;
      const system = agente === "nutri" ? promptNutri(anamnese) : promptPersonal(anamnese, plano);

      // aborta a chamada ao OpenRouter se o cliente desistir
      const ctrl = new AbortController();
      req.raw.on("close", () => ctrl.abort());

      abrirSSE(reply);
      try {
        await conversar({
          system,
          mensagens,
          maxTokens: agente === "nutri" ? 1800 : 1400,
          sinal: ctrl.signal,
          onPedaco: (p) => enviar(reply, "pedaco", p),
        });
        enviar(reply, "fim", { ok: true });
      } catch (e) {
        req.log.error({ err: e.message }, "falha na IA");
        enviar(reply, "erro", { erro: e.message || "A IA falhou. Tenta de novo." });
      } finally {
        reply.raw.end();
      }
    }
  );
}
