import { EMAIL_OK, hashSenha, normalizarEmail, novoId, registrar, senhaFraca } from "./auth.js";
import { q } from "./db.js";

/**
 * Cria o primeiro administrador a partir do ambiente.
 *
 * Sem isso o sistema nasce trancado: o cadastro publico entra como "pendente" e
 * so um admin libera — mas nao existiria nenhum admin para liberar o primeiro.
 */
export async function semearAdmin() {
  const email = normalizarEmail(process.env.ADMIN_EMAIL);
  const senha = process.env.ADMIN_SENHA;
  const nome = process.env.ADMIN_NOME || "Administrador";

  const { rows: existentes } = await q(
    "select id, email, role, status from linha.users where role = 'admin' limit 1"
  );

  if (!email || !senha) {
    if (!existentes.length) {
      console.warn(
        "[boot] ATENÇÃO: não existe nenhum administrador e ADMIN_EMAIL/ADMIN_SENHA não foram definidos.\n" +
          "       Ninguém vai conseguir liberar os cadastros. Defina as duas variáveis e reinicie."
      );
    }
    return;
  }

  if (!EMAIL_OK.test(email)) {
    console.error("[boot] ADMIN_EMAIL não é um e-mail válido. Admin não foi criado.");
    return;
  }

  const fraca = senhaFraca(senha);
  if (fraca) {
    console.error(`[boot] ADMIN_SENHA recusada: ${fraca} Admin não foi criado.`);
    return;
  }

  const { rows } = await q("select id, role, status from linha.users where email = $1", [email]);
  const usuario = rows[0];

  if (!usuario) {
    const id = novoId();
    await q(
      `insert into linha.users (id, email, nome, senha_hash, role, status, liberado_em)
       values ($1, $2, $3, $4, 'admin', 'ativo', now())`,
      [id, email, nome, await hashSenha(senha)]
    );
    await registrar("admin.semeado", { atorId: id, alvoId: id, meta: { email } });
    console.log(`[boot] administrador criado: ${email}`);
    return;
  }

  // Ja existe alguem com esse e-mail. Garante que ele e admin e esta ativo,
  // mas NAO mexe na senha (trocar senha em todo restart seria uma surpresa ruim).
  if (usuario.role !== "admin" || usuario.status !== "ativo") {
    await q(
      "update linha.users set role = 'admin', status = 'ativo', liberado_em = coalesce(liberado_em, now()) where id = $1",
      [usuario.id]
    );
    await registrar("admin.promovido", { atorId: usuario.id, alvoId: usuario.id, meta: { email } });
    console.log(`[boot] ${email} promovido a administrador ativo`);
  }

  // Valvula de escape para senha de admin perdida: sobe uma vez com
  // RESETAR_SENHA_ADMIN=true, entra, e remove a variavel do EasyPanel.
  if (process.env.RESETAR_SENHA_ADMIN === "true") {
    await q("update linha.users set senha_hash = $1 where id = $2", [
      await hashSenha(senha),
      usuario.id,
    ]);
    await q("delete from linha.sessions where user_id = $1", [usuario.id]);
    await registrar("admin.senha_resetada", { atorId: usuario.id, alvoId: usuario.id });
    console.warn(
      `[boot] senha do admin ${email} foi redefinida por RESETAR_SENHA_ADMIN.\n` +
        "       REMOVA essa variável do EasyPanel agora — senão ela redefine a senha a cada restart."
    );
  }
}
