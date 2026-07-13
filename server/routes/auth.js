import {
  COOKIE,
  conferirSenha,
  criarSessao,
  derrubarSessao,
  derrubarTodasSessoes,
  EMAIL_OK,
  hashSenha,
  normalizarEmail,
  novoId,
  queimarTempo,
  registrar,
  senhaFraca,
} from "../auth.js";
import { q } from "../db.js";

const PROD = process.env.NODE_ENV === "production";

const opcoesCookie = () => ({
  httpOnly: true, // JavaScript da pagina nao enxerga o cookie -> XSS nao rouba a sessao
  // Em producao o cookie SEMPRE trafega so por HTTPS. Fora de producao, so quando
  // pedido de proposito. Assim nao da pra desligar o Secure em prod por engano.
  secure: PROD ? true : process.env.COOKIE_SECURE === "true",
  sameSite: "lax", // barra POST vindo de outro site
  path: "/",
  signed: false, // o token ja e aleatorio de 256 bits; assinar nao acrescenta nada
});

const corpoLogin = {
  type: "object",
  required: ["email", "senha"],
  properties: {
    email: { type: "string", maxLength: 200 },
    senha: { type: "string", maxLength: 200 },
  },
};

export default async function rotasAuth(app) {
  // ─── Cadastro ──────────────────────────────────────────────────────────────
  // Qualquer um se cadastra, mas entra como "pendente". So vira "ativo" quando
  // o administrador liberar na tela de admin.
  app.post(
    "/registrar",
    {
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
      schema: {
        body: {
          type: "object",
          required: ["nome", "email", "senha"],
          properties: {
            nome: { type: "string", minLength: 2, maxLength: 80 },
            email: { type: "string", maxLength: 200 },
            senha: { type: "string", maxLength: 200 },
          },
        },
      },
    },
    async (req, reply) => {
      const email = normalizarEmail(req.body.email);
      const nome = req.body.nome.trim();

      if (!EMAIL_OK.test(email)) {
        return reply.code(400).send({ erro: "Esse e-mail não parece válido." });
      }

      const fraca = senhaFraca(req.body.senha);
      if (fraca) return reply.code(400).send({ erro: fraca });

      const id = novoId();
      try {
        await q(
          `insert into linha.users (id, email, nome, senha_hash, role, status)
           values ($1, $2, $3, $4, 'user', 'pendente')`,
          [id, email, nome, await hashSenha(req.body.senha)]
        );
      } catch (e) {
        // 23505 = violacao de indice unico. Corrida entre dois cadastros do mesmo
        // e-mail cai aqui tambem, e nao so o SELECT-antes-do-INSERT.
        if (e.code === "23505") {
          return reply.code(409).send({ erro: "Esse e-mail já tem cadastro." });
        }
        throw e;
      }

      await registrar("usuario.cadastrou", { alvoId: id, meta: { email, nome }, ip: req.ip });

      return reply.code(201).send({
        ok: true,
        mensagem: "Cadastro feito! Agora é só esperar o administrador liberar seu acesso.",
      });
    }
  );

  // ─── Entrar ────────────────────────────────────────────────────────────────
  app.post(
    "/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
      schema: { body: corpoLogin },
    },
    async (req, reply) => {
      const email = normalizarEmail(req.body.email);

      const { rows } = await q(
        "select id, email, nome, senha_hash, role, status from linha.users where email = $1",
        [email]
      );
      const u = rows[0];

      if (!u) {
        // Gasta o mesmo tempo de CPU de um login real: sem isso, dava pra
        // descobrir quais e-mails tem conta so cronometrando a resposta.
        await queimarTempo();
        return reply.code(401).send({ erro: "E-mail ou senha incorretos." });
      }

      if (!(await conferirSenha(req.body.senha, u.senha_hash))) {
        await registrar("login.senha_errada", { alvoId: u.id, meta: { email }, ip: req.ip });
        return reply.code(401).send({ erro: "E-mail ou senha incorretos." });
      }

      // A senha conferiu. So agora vale revelar o estado da conta — antes disso,
      // seria entregar de graca quais e-mails existem no sistema.
      if (u.status === "pendente") {
        return reply.code(403).send({
          erro: "Seu cadastro ainda não foi liberado pelo administrador.",
          motivo: "pendente",
        });
      }
      if (u.status === "bloqueado") {
        return reply.code(403).send({ erro: "Seu acesso foi bloqueado.", motivo: "bloqueado" });
      }

      const { token, expira } = await criarSessao(u.id, req);
      await q("update linha.users set ultimo_login = now() where id = $1", [u.id]);
      await registrar("login.ok", { atorId: u.id, alvoId: u.id, ip: req.ip });

      reply.setCookie(COOKIE, token, { ...opcoesCookie(), expires: expira });

      return { id: u.id, nome: u.nome, email: u.email, role: u.role };
    }
  );

  // ─── Sair ──────────────────────────────────────────────────────────────────
  app.post("/logout", async (req, reply) => {
    await derrubarSessao(req.cookies?.[COOKIE]);
    reply.clearCookie(COOKIE, opcoesCookie());
    return { ok: true };
  });

  // ─── Quem sou eu ───────────────────────────────────────────────────────────
  // O app chama isso ao abrir para saber se mostra o login ou a rotina.
  app.get("/eu", async (req, reply) => {
    if (!req.usuario) return reply.code(401).send({ erro: "Não logado." });
    return req.usuario;
  });

  // ─── Trocar a propria senha ────────────────────────────────────────────────
  app.post(
    "/trocar-senha",
    {
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
      schema: {
        body: {
          type: "object",
          required: ["atual", "nova"],
          properties: {
            atual: { type: "string", maxLength: 200 },
            nova: { type: "string", maxLength: 200 },
          },
        },
      },
    },
    async (req, reply) => {
      if (!req.usuario) return reply.code(401).send({ erro: "Você precisa entrar." });

      const { rows } = await q("select senha_hash from linha.users where id = $1", [req.usuario.id]);
      if (!rows[0] || !(await conferirSenha(req.body.atual, rows[0].senha_hash))) {
        return reply.code(401).send({ erro: "A senha atual está errada." });
      }

      const fraca = senhaFraca(req.body.nova);
      if (fraca) return reply.code(400).send({ erro: fraca });

      await q("update linha.users set senha_hash = $1 where id = $2", [
        await hashSenha(req.body.nova),
        req.usuario.id,
      ]);

      // Derruba todas as sessoes (inclusive as de outros aparelhos) e devolve
      // uma nova pra este. Se alguem tinha a senha velha, perdeu o acesso agora.
      await derrubarTodasSessoes(req.usuario.id);
      const { token, expira } = await criarSessao(req.usuario.id, req);
      reply.setCookie(COOKIE, token, { ...opcoesCookie(), expires: expira });

      await registrar("senha.trocada", { atorId: req.usuario.id, alvoId: req.usuario.id, ip: req.ip });

      return { ok: true, mensagem: "Senha trocada. Os outros aparelhos foram desconectados." };
    }
  );
}
