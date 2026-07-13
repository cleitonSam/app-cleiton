// ─── Cliente OpenRouter ───────────────────────────────────────────────────────
// A chave vive SÓ aqui (no servidor, via ENV). O navegador nunca a vê: ele fala
// com /api/ia/* e este módulo é quem conversa com o OpenRouter.

const URL = "https://openrouter.ai/api/v1/chat/completions";

export const IA_ATIVA = () => !!process.env.OPENROUTER_API_KEY;

const MODELO = () => process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

function cabecalhos() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    // O OpenRouter recomenda identificar o app (aparece no ranking deles).
    // Headers HTTP são ByteString (Latin-1): nada de travessão/acento aqui,
    // senão o fetch estoura ("character value greater than 255").
    "HTTP-Referer": process.env.APP_URL || "https://linha.app",
    "X-Title": "Linha - copiloto de rotina",
  };
}

/**
 * Faz a chamada em streaming e repassa o texto pedaço a pedaço pelo callback.
 * Devolve o texto completo no fim. Lança em erro de API.
 */
export async function conversar({ system, mensagens, onPedaco, maxTokens = 1400, sinal }) {
  if (!IA_ATIVA()) throw new Error("IA não configurada no servidor.");

  const corpo = {
    model: MODELO(),
    messages: [{ role: "system", content: system }, ...mensagens],
    max_tokens: maxTokens,
    temperature: 0.6,
    stream: true,
  };

  const resp = await fetch(URL, {
    method: "POST",
    headers: cabecalhos(),
    body: JSON.stringify(corpo),
    signal: sinal,
  });

  if (!resp.ok || !resp.body) {
    let detalhe = "";
    try {
      detalhe = (await resp.json())?.error?.message || "";
    } catch {
      /* sem corpo */
    }
    throw new Error(`IA respondeu ${resp.status}${detalhe ? ": " + detalhe : ""}`);
  }

  // O OpenRouter devolve SSE: linhas "data: {json}\n\n".
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buffer = "";
  let completo = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });

    const linhas = buffer.split("\n");
    buffer = linhas.pop() || ""; // guarda a última linha (possivelmente parcial)

    for (const linha of linhas) {
      const l = linha.trim();
      if (!l.startsWith("data:")) continue;
      const dado = l.slice(5).trim();
      if (dado === "[DONE]") continue;
      try {
        const j = JSON.parse(dado);
        const pedaco = j.choices?.[0]?.delta?.content || "";
        if (pedaco) {
          completo += pedaco;
          onPedaco?.(pedaco);
        }
      } catch {
        // comentários do SSE (": OPENROUTER PROCESSING") caem aqui; ignora
      }
    }
  }

  return completo;
}
