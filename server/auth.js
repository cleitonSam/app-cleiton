import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { q } from "./db.js";

const scrypt = promisify(scryptCb);

// scrypt vem no Node. Nao precisa de bcrypt/argon2, que exigem compilar
// modulo nativo dentro do Docker.
const N = 2 ** 15; // custo de CPU/memoria
const R = 8;
const P = 1;
const KEYLEN = 64;
// 128 * N * r = ~33 MB, acima do maxmem padrao (32 MB) — precisa subir na mao.
const MAXMEM = 96 * 1024 * 1024;

export async function hashSenha(senha) {
  const salt = randomBytes(16);
  const chave = await scrypt(senha, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${chave.toString("base64")}`;
}

export async function conferirSenha(senha, guardado) {
  try {
    const [alg, n, r, p, saltB64, hashB64] = String(guardado).split("$");
    if (alg !== "scrypt") return false;

    const salt = Buffer.from(saltB64, "base64");
    const esperado = Buffer.from(hashB64, "base64");
    const calculado = await scrypt(senha, salt, esperado.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
    });
    return timingSafeEqual(esperado, calculado);
  } catch {
    return false;
  }
}

// Hash descartavel de um usuario que nao existe. Gastar o mesmo tempo de CPU
// no login de e-mail inexistente impede descobrir quem tem conta pelo relogio.
const HASH_ISCA = await hashSenha(randomBytes(24).toString("hex"));
export const queimarTempo = () => conferirSenha("senha-que-nao-existe", HASH_ISCA);

export const COOKIE = "linha_sess";
const DIAS_SESSAO = Number(process.env.SESSION_DAYS || 30);

const digerir = (token) => createHash("sha256").update(token).digest("hex");

/**
 * O cookie leva o token cru; o banco guarda so o sha256.
 * Assim um dump do banco nao entrega nenhuma sessao ativa.
 */
export async function criarSessao(userId, req) {
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + DIAS_SESSAO * 86_400_000);

  await q(
    `insert into linha.sessions (token_hash, user_id, expira_em, user_agent, ip)
     values ($1, $2, $3, $4, $5)`,
    [digerir(token), userId, expira, String(req.headers["user-agent"] || "").slice(0, 300), req.ip]
  );

  return { token, expira };
}

export async function derrubarSessao(token) {
  if (!token) return;
  await q("delete from linha.sessions where token_hash = $1", [digerir(token)]);
}

export async function derrubarTodasSessoes(userId) {
  await q("delete from linha.sessions where user_id = $1", [userId]);
}

/**
 * Resolve o cookie -> usuario. Devolve null se a sessao expirou, se o usuario
 * sumiu ou se ele nao esta mais 'ativo' (bloqueado pelo admin cai na hora —
 * e por isso que a sessao vive no banco, e nao num JWT).
 */
export async function usuarioDaSessao(token) {
  if (!token) return null;

  const { rows } = await q(
    `select u.id, u.email, u.nome, u.role, u.status, s.expira_em
       from linha.sessions s
       join linha.users u on u.id = s.user_id
      where s.token_hash = $1`,
    [digerir(token)]
  );

  const s = rows[0];
  if (!s) return null;

  if (new Date(s.expira_em) < new Date()) {
    await derrubarSessao(token);
    return null;
  }
  if (s.status !== "ativo") return null;

  return { id: s.id, email: s.email, nome: s.nome, role: s.role, status: s.status };
}

export async function marcarUso(token) {
  await q("update linha.sessions set ultimo_uso = now() where token_hash = $1", [digerir(token)]);
}

export async function limparSessoesVencidas() {
  const { rowCount } = await q("delete from linha.sessions where expira_em < now()");
  if (rowCount) console.log(`[auth] ${rowCount} sessao(oes) vencida(s) removida(s)`);
}

export async function registrar(acao, { atorId = null, alvoId = null, meta = null, ip = null } = {}) {
  await q(
    `insert into linha.audit_log (ator_id, acao, alvo_id, meta, ip) values ($1, $2, $3, $4, $5)`,
    [atorId, acao, alvoId, meta ? JSON.stringify(meta) : null, ip]
  ).catch((e) => console.error("[audit] falhou:", e.message));
}

export const novoId = () => randomUUID();

/** Regras minimas de senha. Curta demais, e o resto da seguranca nao adianta. */
export function senhaFraca(senha) {
  if (typeof senha !== "string" || senha.length < 10) {
    return "A senha precisa de pelo menos 10 caracteres.";
  }
  if (senha.length > 200) return "Senha longa demais.";
  if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    return "A senha precisa ter pelo menos uma letra e um número.";
  }

  const min = senha.toLowerCase();

  // Sequencias obvias em qualquer lugar da senha.
  if (/(12345|qwerty|abcdef|00000)/.test(min)) {
    return "Essa senha é fácil de adivinhar. Escolhe outra.";
  }

  // "senha2026", "admin1234", "password1": a palavra obvia + numeros e nada mais.
  // Compara so as LETRAS — assim "MinhaSenhaBoa2026" passa, que e o certo:
  // conter a palavra nao e o problema; SER a palavra e.
  const soLetras = min.replace(/[^a-zà-ú]/g, "");
  const obvias = ["senha", "password", "admin", "linha", "teste", "usuario"];
  if (obvias.includes(soLetras)) {
    return "Essa senha é fácil de adivinhar. Escolhe outra.";
  }

  return null;
}

export const normalizarEmail = (e) => String(e || "").trim().toLowerCase();

/**
 * Confere o e-mail sem regex.
 * A regex equivalente tem backtracking (o ponto cabe dentro de [^\s@]), e escrever
 * isso na mao e mais rapido de ler do que decifrar a versao blindada.
 */
export const EMAIL_OK = {
  test(valor) {
    if (typeof valor !== "string" || !valor || valor.length > 200) return false;
    if (/\s/.test(valor)) return false;

    const partes = valor.split("@");
    if (partes.length !== 2) return false;

    const [local, dominio] = partes;
    if (!local || !dominio) return false;

    const ponto = dominio.lastIndexOf(".");
    // Precisa de um ponto que nao esteja na ponta e de um TLD com 2+ letras.
    return ponto > 0 && dominio.length - ponto - 1 >= 2;
  },
};
