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
};

export const semConexao = (e) => e instanceof ErroApi && e.status === 0;
