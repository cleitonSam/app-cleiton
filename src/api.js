// Conversa com o servidor. Mesma origem, então a sessão vai no cookie httpOnly
// e o JavaScript da página nunca toca no token.

export class ErroApi extends Error {
  constructor(mensagem, status, corpo) {
    super(mensagem);
    this.status = status;
    this.corpo = corpo || {};
  }
}

async function chamar(caminho, { metodo = "GET", corpo } = {}) {
  let r;
  try {
    r = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: corpo ? { "content-type": "application/json" } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
      credentials: "same-origin",
    });
  } catch {
    // Sem rede. Não é erro de aplicação — o app offline continua funcionando.
    throw new ErroApi("sem-conexao", 0);
  }

  if (r.status === 204) return null;

  let dados = null;
  try {
    dados = await r.json();
  } catch {
    /* resposta sem corpo */
  }

  if (!r.ok) {
    throw new ErroApi(dados?.erro || `Erro ${r.status}`, r.status, dados);
  }
  return dados;
}

export const api = {
  // ── sessão
  eu: () => chamar("/auth/eu"),
  entrar: (email, senha) => chamar("/auth/login", { metodo: "POST", corpo: { email, senha } }),
  cadastrar: (nome, email, senha) =>
    chamar("/auth/registrar", { metodo: "POST", corpo: { nome, email, senha } }),
  sair: () => chamar("/auth/logout", { metodo: "POST" }),
  trocarSenha: (atual, nova) =>
    chamar("/auth/trocar-senha", { metodo: "POST", corpo: { atual, nova } }),

  // ── estado do app
  puxarEstado: () => chamar("/estado"),
  salvarEstado: (data, baseVersao) =>
    chamar("/estado", { metodo: "PUT", corpo: { data, baseVersao } }),

  // ── administração
  usuarios: (filtro = {}) => {
    const p = new URLSearchParams();
    if (filtro.status && filtro.status !== "todos") p.set("status", filtro.status);
    if (filtro.busca) p.set("busca", filtro.busca);
    const qs = p.toString();
    return chamar(`/admin/usuarios${qs ? `?${qs}` : ""}`);
  },
  mudarStatus: (id, status) =>
    chamar(`/admin/usuarios/${id}/status`, { metodo: "PATCH", corpo: { status } }),
  mudarRole: (id, role) => chamar(`/admin/usuarios/${id}/role`, { metodo: "PATCH", corpo: { role } }),
  criarUsuario: (dados) => chamar("/admin/usuarios", { metodo: "POST", corpo: dados }),
  redefinirSenha: (id, senha) =>
    chamar(`/admin/usuarios/${id}/senha`, { metodo: "POST", corpo: { senha } }),
  apagarUsuario: (id) => chamar(`/admin/usuarios/${id}`, { metodo: "DELETE" }),
  log: () => chamar("/admin/log"),

  // ── treino
  treinoGrupos: () => chamar("/treino/grupos"),
  treinoExercicios: (filtro = {}) => {
    const p = new URLSearchParams();
    if (filtro.grupo) p.set("grupo", filtro.grupo);
    if (filtro.busca) p.set("busca", filtro.busca);
    if (filtro.nivel) p.set("nivel", filtro.nivel);
    return chamar(`/treino/exercicios?${p.toString()}`);
  },
  treinoExercicio: (id) => chamar(`/treino/exercicio/${id}`),
  treinoGerar: (anamnese) => chamar("/treino/gerar", { metodo: "POST", corpo: { anamnese } }),
  nutriAlimentos: (q) => chamar(`/nutri/alimentos?q=${encodeURIComponent(q)}`),
  iaStatus: () => chamar("/ia/status"),
  iaDieta: (anamnese, prefs, pedido) => chamar("/ia/dieta", { metodo: "POST", corpo: { anamnese, prefs, pedido } }),
  iaPlano: (anamnese, imagem) => chamar("/ia/plano", { metodo: "POST", corpo: { anamnese, imagem } }),

  // fotos de check-in (diário)
  fotoSalvar: (imagem, nota) => chamar("/treino/foto", { metodo: "POST", corpo: { imagem, nota } }),
  fotos: () => chamar("/treino/fotos"),
  fotoApagar: (id) => chamar(`/treino/foto/${id}`, { metodo: "DELETE" }),
};

export const semConexao = (e) => e instanceof ErroApi && e.status === 0;

/**
 * Conversa com um agente de IA (personal | nutri) em streaming.
 * onPedaco recebe cada trecho do texto conforme chega. Devolve o texto completo.
 */
export async function conversarIA(agente, { mensagens, anamnese, plano, sinal, onPedaco }) {
  let r;
  try {
    r = await fetch(`/api/ia/${agente}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mensagens, anamnese, plano }),
      credentials: "same-origin",
      signal: sinal,
    });
  } catch {
    throw new ErroApi("sem-conexao", 0);
  }

  if (!r.ok || !r.body) {
    let msg = "A IA falhou.";
    try {
      msg = (await r.json())?.erro || msg;
    } catch {
      /* sem corpo */
    }
    throw new ErroApi(msg, r.status);
  }

  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buffer = "";
  let completo = "";
  let evento = "pedaco";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const linhas = buffer.split("\n");
    buffer = linhas.pop() || "";
    for (const linha of linhas) {
      const l = linha.trimEnd();
      if (l.startsWith("event:")) {
        evento = l.slice(6).trim();
      } else if (l.startsWith("data:")) {
        const dado = l.slice(5).trim();
        try {
          const j = JSON.parse(dado);
          if (evento === "erro") throw new ErroApi(j?.erro || "A IA falhou.", 500);
          if (evento === "pedaco" && typeof j === "string") {
            completo += j;
            onPedaco?.(j);
          }
        } catch (e) {
          if (e instanceof ErroApi) throw e;
          // linha de dado não-JSON: ignora
        }
      }
    }
  }

  return completo;
}
