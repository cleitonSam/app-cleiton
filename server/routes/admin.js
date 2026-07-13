import {
  derrubarTodasSessoes,
  EMAIL_OK,
  hashSenha,
  normalizarEmail,
  novoId,
  registrar,
  senhaFraca,
} from "../auth.js";
import { q, tx } from "../db.js";
import { exigeAdmin } from "../guards.js";

const CAMPOS = `id, email, nome, role, status, criado_em, liberado_em, ultimo_login`;

// "for update" TRAVA as linhas dos admins ativos dentro da transação. Sem isso,
// dois pedidos simultâneos (rebaixar o admin A e o B ao mesmo tempo) poderiam
// AMBOS ver "ainda tem 2 admins" e passar — deixando o sistema sem nenhum admin.
// Um count(*) não trava nada; travar as linhas serializa os dois pedidos.
const contarAdminsAtivos = async (cliente) => {
  const { rows } = await cliente.query(
    "select id from linha.users where role = 'admin' and status = 'ativo' for update"
  );
  return rows.length;
};

export default async function rotasAdmin(app) {
  // Todas as rotas daqui pra baixo exigem administrador.
  app.addHook("preHandler", exigeAdmin);

  // ─── Lista de usuarios ─────────────────────────────────────────────────────
  app.get(
    "/usuarios",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pendente", "ativo", "bloqueado", "todos"] },
            busca: { type: "string", maxLength: 100 },
          },
        },
      },
    },
    async (req) => {
      const { status = "todos", busca = "" } = req.query;

      const filtros = [];
      const params = [];

      if (status !== "todos") {
        params.push(status);
        filtros.push(`status = $${params.length}`);
      }
      if (busca.trim()) {
        params.push(`%${busca.trim().toLowerCase()}%`);
        filtros.push(`(lower(nome) like $${params.length} or email like $${params.length})`);
      }

      const onde = filtros.length ? `where ${filtros.join(" and ")}` : "";

      const { rows: usuarios } = await q(
        `select ${CAMPOS},
                (select count(*)::int from linha.sessions s where s.user_id = u.id and s.expira_em > now()) as sessoes_ativas
           from linha.users u
           ${onde}
          -- pendentes primeiro: e o que o admin abre a tela para resolver
          order by (status = 'pendente') desc, criado_em desc
          limit 500`,
        params
      );

      const { rows: resumo } = await q(
        `select
           count(*) filter (where status = 'pendente')::int  as pendentes,
           count(*) filter (where status = 'ativo')::int     as ativos,
           count(*) filter (where status = 'bloqueado')::int as bloqueados
         from linha.users`
      );

      return { usuarios, resumo: resumo[0] };
    }
  );

  // ─── Liberar / bloquear / voltar a pendente ────────────────────────────────
  app.patch(
    "/usuarios/:id/status",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string", format: "uuid" } } },
        body: {
          type: "object",
          required: ["status"],
          properties: { status: { type: "string", enum: ["ativo", "bloqueado", "pendente"] } },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const { status } = req.body;

      if (id === req.usuario.id && status !== "ativo") {
        return reply.code(400).send({ erro: "Você não pode bloquear a si mesmo." });
      }

      const resultado = await tx(async (c) => {
        const { rows } = await c.query(
          "select id, email, nome, role, status from linha.users where id = $1 for update",
          [id]
        );
        const alvo = rows[0];
        if (!alvo) return { erro: 404 };
        if (alvo.status === status) return { alvo, semMudanca: true };

        // Trava de seguranca: se o ultimo admin ativo for desativado, ninguem
        // mais consegue liberar cadastro nenhum — o sistema fica morto.
        if (alvo.role === "admin" && alvo.status === "ativo" && status !== "ativo") {
          if ((await contarAdminsAtivos(c)) <= 1) {
            return { erro: 400, mensagem: "Esse é o único administrador ativo. Promova outro antes." };
          }
        }

        const { rows: atualizado } = await c.query(
          `update linha.users
              set status = $1,
                  liberado_em  = case when $1 = 'ativo' then coalesce(liberado_em, now()) else liberado_em end,
                  liberado_por = case when $1 = 'ativo' then $2 else liberado_por end
            where id = $3
        returning ${CAMPOS}`,
          [status, req.usuario.id, id]
        );

        // Tirou o acesso? Derruba a sessao agora, no mesmo commit. Sem isso, quem
        // ja estava logado continuaria dentro ate o cookie vencer.
        if (status !== "ativo") {
          await c.query("delete from linha.sessions where user_id = $1", [id]);
        }

        return { alvo, novo: atualizado[0] };
      });

      if (resultado.erro === 404) return reply.code(404).send({ erro: "Usuário não encontrado." });
      if (resultado.erro === 400) return reply.code(400).send({ erro: resultado.mensagem });
      if (resultado.semMudanca) return { ok: true, usuario: resultado.alvo, semMudanca: true };

      const acao = { ativo: "usuario.liberado", bloqueado: "usuario.bloqueado", pendente: "usuario.pendente" }[status];
      await registrar(acao, {
        atorId: req.usuario.id,
        alvoId: id,
        meta: { email: resultado.alvo.email, de: resultado.alvo.status, para: status },
        ip: req.ip,
      });

      return { ok: true, usuario: resultado.novo };
    }
  );

  // ─── Promover / rebaixar administrador ─────────────────────────────────────
  app.patch(
    "/usuarios/:id/role",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string", format: "uuid" } } },
        body: {
          type: "object",
          required: ["role"],
          properties: { role: { type: "string", enum: ["admin", "user"] } },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const { role } = req.body;

      if (id === req.usuario.id && role !== "admin") {
        return reply.code(400).send({ erro: "Você não pode tirar o seu próprio acesso de admin." });
      }

      const resultado = await tx(async (c) => {
        const { rows } = await c.query(
          "select id, email, role, status from linha.users where id = $1 for update",
          [id]
        );
        const alvo = rows[0];
        if (!alvo) return { erro: 404 };

        if (alvo.role === "admin" && role === "user" && alvo.status === "ativo") {
          if ((await contarAdminsAtivos(c)) <= 1) {
            return { erro: 400, mensagem: "Esse é o único administrador ativo. Promova outro antes." };
          }
        }

        // Virar admin sem estar ativo nao faz sentido: ele nao conseguiria entrar.
        const { rows: atualizado } = await c.query(
          `update linha.users
              set role = $1,
                  status = case when $1 = 'admin' then 'ativo' else status end
            where id = $2
        returning ${CAMPOS}`,
          [role, id]
        );

        return { alvo, novo: atualizado[0] };
      });

      if (resultado.erro === 404) return reply.code(404).send({ erro: "Usuário não encontrado." });
      if (resultado.erro === 400) return reply.code(400).send({ erro: resultado.mensagem });

      await registrar(role === "admin" ? "usuario.promovido" : "usuario.rebaixado", {
        atorId: req.usuario.id,
        alvoId: id,
        meta: { email: resultado.alvo.email },
        ip: req.ip,
      });

      return { ok: true, usuario: resultado.novo };
    }
  );

  // ─── Criar usuario ja liberado ─────────────────────────────────────────────
  // Atalho para quando o admin quer dar acesso a alguem sem pedir que se cadastre.
  app.post(
    "/usuarios",
    {
      schema: {
        body: {
          type: "object",
          required: ["nome", "email", "senha"],
          properties: {
            nome: { type: "string", minLength: 2, maxLength: 80 },
            email: { type: "string", maxLength: 200 },
            senha: { type: "string", maxLength: 200 },
            role: { type: "string", enum: ["admin", "user"] },
          },
        },
      },
    },
    async (req, reply) => {
      const email = normalizarEmail(req.body.email);
      if (!EMAIL_OK.test(email)) return reply.code(400).send({ erro: "Esse e-mail não parece válido." });

      const fraca = senhaFraca(req.body.senha);
      if (fraca) return reply.code(400).send({ erro: fraca });

      const id = novoId();
      const role = req.body.role || "user";

      try {
        const { rows } = await q(
          `insert into linha.users (id, email, nome, senha_hash, role, status, liberado_em, liberado_por)
           values ($1, $2, $3, $4, $5, 'ativo', now(), $6)
       returning ${CAMPOS}`,
          [id, email, req.body.nome.trim(), await hashSenha(req.body.senha), role, req.usuario.id]
        );

        await registrar("usuario.criado_pelo_admin", {
          atorId: req.usuario.id,
          alvoId: id,
          meta: { email, role },
          ip: req.ip,
        });

        return reply.code(201).send({ ok: true, usuario: rows[0] });
      } catch (e) {
        if (e.code === "23505") return reply.code(409).send({ erro: "Esse e-mail já tem cadastro." });
        throw e;
      }
    }
  );

  // ─── Redefinir a senha de alguem ───────────────────────────────────────────
  app.post(
    "/usuarios/:id/senha",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string", format: "uuid" } } },
        body: {
          type: "object",
          required: ["senha"],
          properties: { senha: { type: "string", maxLength: 200 } },
        },
      },
    },
    async (req, reply) => {
      const fraca = senhaFraca(req.body.senha);
      if (fraca) return reply.code(400).send({ erro: fraca });

      const { rowCount } = await q("update linha.users set senha_hash = $1 where id = $2", [
        await hashSenha(req.body.senha),
        req.params.id,
      ]);
      if (!rowCount) return reply.code(404).send({ erro: "Usuário não encontrado." });

      // A senha mudou: as sessoes abertas com a senha antiga morrem aqui.
      await derrubarTodasSessoes(req.params.id);
      await registrar("senha.redefinida_pelo_admin", {
        atorId: req.usuario.id,
        alvoId: req.params.id,
        ip: req.ip,
      });

      return { ok: true, mensagem: "Senha redefinida. Passe a nova senha para a pessoa." };
    }
  );

  // ─── Apagar usuario ────────────────────────────────────────────────────────
  app.delete(
    "/usuarios/:id",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string", format: "uuid" } } },
      },
    },
    async (req, reply) => {
      const { id } = req.params;

      if (id === req.usuario.id) {
        return reply.code(400).send({ erro: "Você não pode apagar a sua própria conta." });
      }

      const resultado = await tx(async (c) => {
        const { rows } = await c.query(
          "select id, email, role, status from linha.users where id = $1 for update",
          [id]
        );
        const alvo = rows[0];
        if (!alvo) return { erro: 404 };

        if (alvo.role === "admin" && alvo.status === "ativo" && (await contarAdminsAtivos(c)) <= 1) {
          return { erro: 400, mensagem: "Esse é o único administrador ativo. Promova outro antes." };
        }

        // ATENCAO: o "on delete cascade" leva junto a sessao E todo o historico
        // do app dessa pessoa (rotina, peso, dieta). Nao tem volta.
        await c.query("delete from linha.users where id = $1", [id]);
        return { alvo };
      });

      if (resultado.erro === 404) return reply.code(404).send({ erro: "Usuário não encontrado." });
      if (resultado.erro === 400) return reply.code(400).send({ erro: resultado.mensagem });

      await registrar("usuario.apagado", {
        atorId: req.usuario.id,
        alvoId: id,
        meta: { email: resultado.alvo.email },
        ip: req.ip,
      });

      return { ok: true };
    }
  );

  // ─── Trilha de auditoria ───────────────────────────────────────────────────
  app.get(
    "/log",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { limite: { type: "integer", minimum: 1, maximum: 200, default: 60 } },
        },
      },
    },
    async (req) => {
      const { rows } = await q(
        `select l.id, l.acao, l.meta, l.ip, l.em,
                ator.nome  as ator_nome,  ator.email  as ator_email,
                alvo.nome  as alvo_nome,  alvo.email  as alvo_email
           from linha.audit_log l
           left join linha.users ator on ator.id = l.ator_id
           left join linha.users alvo on alvo.id = l.alvo_id
          order by l.em desc
          limit $1`,
        [req.query.limite || 60]
      );
      return { eventos: rows };
    }
  );
}
