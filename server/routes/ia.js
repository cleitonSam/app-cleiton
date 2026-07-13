import { exigeLogin } from "../guards.js";
import { conversar, IA_ATIVA } from "../ia.js";
import { calcularNutricao, casarExercicio, gerarPlano, indiceParaIA, prescricao } from "../treino.js";

// extrai o 1º objeto JSON de um texto (a IA às vezes embrulha em ```json)
function extrairJSON(texto) {
  const limpo = String(texto).replace(/```json?/gi, "").replace(/```/g, "").trim();
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini < 0 || fim < 0) throw new Error("sem JSON");
  return JSON.parse(limpo.slice(ini, fim + 1));
}

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

  // ─── Gerar cardápio estruturado (JSON) a partir das preferências ────────────
  // Usa as respostas do questionário (o que gosta / não gosta, horários das
  // refeições, meta de peso) pra montar uma dieta de verdade, com horários.
  app.post(
    "/ia/dieta",
    {
      config: { rateLimit: { max: 12, timeWindow: "5 minutes" } },
      schema: { body: { type: "object", properties: { anamnese: { type: "object" }, prefs: { type: "object" }, pedido: { type: "string", maxLength: 400 } } } },
    },
    async (req, reply) => {
      if (!IA_ATIVA()) return reply.code(503).send({ erro: "A IA ainda não foi ligada neste servidor." });

      const n = calcularNutricao(req.body.anamnese || {});
      const prefs = req.body.prefs || {};
      const restr = req.body.anamnese?.restricoesAlimentares || prefs.restricoes;
      const pedido = req.body.pedido ? `Pedido do aluno: ${req.body.pedido}.` : "";

      const gosta = Array.isArray(prefs.gosta) && prefs.gosta.length ? `GOSTA de comer: ${prefs.gosta.join(", ")}. Priorize esses.` : "";
      const naoGosta = Array.isArray(prefs.naoGosta) && prefs.naoGosta.length ? `NÃO gosta / evitar: ${prefs.naoGosta.join(", ")}. Não use.` : "";
      const horarios = Array.isArray(prefs.refeicoes) && prefs.refeicoes.length
        ? `Refeições e HORÁRIOS do aluno (use exatamente estes): ${prefs.refeicoes.map((r) => `${r.nome} às ${r.horario}`).join("; ")}.`
        : "Distribua em 5-6 refeições (café, lanche, almoço, lanche, jantar, ceia) com horários razoáveis.";
      const metaPeso = prefs.metaPeso ? `Meta de peso: chegar a ${prefs.metaPeso} kg. ` : "";
      const rotina = prefs.rotina ? `Rotina/observação: ${prefs.rotina}. ` : "";

      const system = `Você é nutricionista. Monta cardápios PERSONALIZADOS com comida brasileira comum e acessível, respeitando o gosto e os horários do aluno.
Responda APENAS com um JSON válido (sem markdown, sem crases), exatamente neste formato:
{"resumo":"uma frase","totais":{"kcal":0,"prot":0,"carb":0,"gord":0},"refeicoes":[{"nome":"Café da manhã","horario":"07:00","itens":[{"alimento":"Ovos mexidos","medida":"3 unidades","kcal":230,"prot":18,"carb":2,"gord":16}],"kcal":230,"prot":18,"carb":2,"gord":16}]}
Regras: os totais devem bater com a meta. Valores numéricos (sem "g" nem "kcal"). ${gosta} ${naoGosta} ${restr ? "Restrições: " + restr + "." : ""}`;

      const meta = `Monte o cardápio do dia para o objetivo "${n.objetivo}" (${n.referencia}). ${metaPeso}Meta diária: ${n.kcalMeta} kcal, ${n.macros.prot}g de proteína, ${n.macros.carb}g de carbo, ${n.macros.gord}g de gordura. ${horarios} ${rotina}${pedido}`;

      try {
        const texto = await conversar({ system, mensagens: [{ role: "user", content: meta }], maxTokens: 2400 });
        const dieta = extrairJSON(texto);
        return { dieta, metas: { kcalMeta: n.kcalMeta, ...n.macros } };
      } catch (e) {
        req.log.error({ err: e.message }, "falha ao gerar dieta");
        return reply.code(502).send({ erro: "Não consegui montar o cardápio agora. Tenta de novo." });
      }
    }
  );

  // ─── Gerar o PLANO DE TREINO com a IA (opcional: foto dos aparelhos) ─────────
  // A IA monta o plano a partir da anamnese, escolhendo exercícios REAIS da
  // biblioteca (o servidor casa cada nome com o exercício certo, pra ter vídeo).
  // Se vier uma foto do lugar onde treina, a IA identifica os aparelhos e monta
  // usando só o que dá pra fazer com eles.
  app.post(
    "/ia/plano",
    {
      config: { rateLimit: { max: 12, timeWindow: "5 minutes" } },
      // foto base64 pode ser grande; este endpoint aceita corpo maior.
      bodyLimit: 6 * 1024 * 1024,
      schema: { body: { type: "object", required: ["anamnese"], properties: { anamnese: { type: "object" }, imagem: { type: "string", maxLength: 8_000_000 } } } },
    },
    async (req, reply) => {
      if (!IA_ATIVA()) return reply.code(503).send({ erro: "A IA ainda não foi ligada neste servidor." });

      const a = req.body.anamnese || {};
      const temFoto = typeof req.body.imagem === "string" && req.body.imagem.startsWith("data:image");
      const presc = prescricao(a.objetivo || "Ganho de massa");

      const lesoes = a.lesoes ? `Lesões/limitações: ${a.lesoes}. NÃO prescreva nada que agrave.` : "";
      const parq = a.parqSim ? "O aluno marcou algo na triagem de saúde (PAR-Q): seja conservador e recomende liberação médica." : "";
      const equipTxt = temFoto
        ? "IMPORTANTE: o aluno mandou uma FOTO do lugar onde treina. Olhe a imagem, identifique os aparelhos/pesos que aparecem e monte o treino usando SÓ o que dá pra fazer com eles. Liste o que você viu em 'equipamentosVistos'."
        : `Equipamentos disponíveis: ${(a.equipamentos || ["academia"]).join(", ")}.`;

      const system = `Você é um personal trainer experiente. Monta um plano de treino COMPLETO e personalizado.
Responda APENAS com um JSON válido (sem markdown), exatamente neste formato:
{"divisao":"ABC","observacao":"uma frase sobre o plano","equipamentosVistos":["halteres","banco"],"treinos":[{"nome":"Treino A","foco":"Peito e tríceps","exercicios":[{"nome":"Supino Reto com Barra","grupo":"Peito","series":4,"reps":"8-12","descanso":"60-90s"}]}]}

REGRAS
- Escolha os exercícios SOMENTE da biblioteca abaixo, com o nome o mais próximo possível do listado.
- Frequência ${a.frequencia || 3}x/semana → escolha a divisão adequada (Full Body, ABC, Superior/Inferior, PPL…). Tempo por treino: ${a.tempo || "60 min"} (mais tempo = mais exercícios).
- Objetivo "${a.objetivo || "Ganho de massa"}": use ${presc.series} séries, ${presc.reps} reps, descanso ${presc.descanso}.
- ${equipTxt}
- ${lesoes} ${parq}
- 3 a 6 exercícios por treino. Grupos coerentes por dia.

BIBLIOTECA (grupo: exercícios):
${indiceParaIA(30)}`;

      const conteudo = temFoto
        ? [{ type: "text", text: "Monte meu plano de treino a partir da foto do lugar onde treino e do meu perfil." }, { type: "image_url", image_url: { url: req.body.imagem } }]
        : "Monte meu plano de treino pelo meu perfil.";

      try {
        const texto = await conversar({ system, mensagens: [{ role: "user", content: conteudo }], maxTokens: 2600 });
        const bruto = extrairJSON(texto);

        // casa cada exercício da IA com um exercício REAL da biblioteca (id + vídeo)
        const usados = new Set();
        const letras = "ABCDEF";
        const treinos = (bruto.treinos || []).slice(0, 6).map((t, i) => {
          const exercicios = [];
          for (const ex of (t.exercicios || []).slice(0, 8)) {
            const real = casarExercicio(ex.nome, ex.grupo);
            if (!real || usados.has(real.id)) continue;
            usados.add(real.id);
            exercicios.push({
              id: real.id,
              nome: real.nome,
              grupo: real.grupo,
              equip: real.equip,
              series: presc.series,
              reps: ex.reps || presc.reps,
              descanso: ex.descanso || presc.descanso,
            });
          }
          return { nome: t.nome || `Treino ${letras[i]}`, foco: t.foco || "", grupos: [...new Set(exercicios.map((e) => e.grupo))], exercicios };
        }).filter((t) => t.exercicios.length > 0);

        if (!treinos.length) throw new Error("nenhum exercício casou");

        const plano = {
          divisao: bruto.divisao || "Personalizado",
          frequencia: Number(a.frequencia) || treinos.length,
          objetivo: a.objetivo || "Ganho de massa",
          nivel: a.nivel || "Iniciante",
          prescricao: presc,
          observacao: bruto.observacao || "",
          // só faz sentido "o que a IA viu" quando o aluno mandou uma foto —
          // sem foto a IA às vezes inventa uma lista, e o app diria "Vi na sua foto" sem foto.
          equipamentosVistos: temFoto && Array.isArray(bruto.equipamentosVistos) ? bruto.equipamentosVistos.slice(0, 12) : [],
          porIA: true,
          treinos,
        };
        return { plano };
      } catch (e) {
        req.log.error({ err: e.message }, "falha ao gerar plano com IA");
        // fallback: o gerador determinístico nunca deixa o aluno sem treino
        return { plano: { ...gerarPlano(a), porIA: false, observacao: "Montado automaticamente (a IA falhou desta vez)." } };
      }
    }
  );

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
