import { q, tx } from "../db.js";
import { exigeLogin } from "../guards.js";

/**
 * O estado do app (rotina, vitorias, dieta, peso, historico) de cada usuario.
 *
 * O servidor guarda um blob JSON versionado e NAO tenta entender o conteudo —
 * quem funde as mudancas de dois aparelhos e o cliente, que conhece o formato.
 * O contador "versao" e o que impede o celular sobrescrever, sem perceber, o que
 * foi escrito no computador cinco minutos antes.
 */
export default async function rotasEstado(app) {
  app.addHook("preHandler", exigeLogin);

  // ─── Puxar ─────────────────────────────────────────────────────────────────
  app.get("/estado", async (req) => {
    const { rows } = await q(
      "select data, versao::int as versao, atualizado_em from linha.app_state where user_id = $1",
      [req.usuario.id]
    );

    // Usuario novo ainda nao tem linha: versao 0 significa "nunca salvou nada".
    if (!rows[0]) return { data: null, versao: 0, atualizado_em: null };

    return rows[0];
  });

  // ─── Salvar ────────────────────────────────────────────────────────────────
  app.put(
    "/estado",
    {
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["data", "baseVersao"],
          properties: {
            data: { type: "object" },
            // Versao que o cliente tinha quando comecou a editar.
            baseVersao: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    async (req, reply) => {
      const { data, baseVersao } = req.body;

      const resultado = await tx(async (c) => {
        // "for update" segura a linha: dois aparelhos salvando ao mesmo tempo
        // entram em fila aqui, em vez de um apagar o outro.
        const { rows } = await c.query(
          "select data, versao::int as versao from linha.app_state where user_id = $1 for update",
          [req.usuario.id]
        );
        const atual = rows[0];
        const versaoAtual = atual?.versao ?? 0;

        if (baseVersao !== versaoAtual) {
          // Alguem salvou no meio do caminho. Devolve o estado do servidor para
          // o cliente fundir com o dele e tentar de novo — nada e descartado.
          return { conflito: true, data: atual?.data ?? null, versao: versaoAtual };
        }

        const { rows: salvo } = await c.query(
          `insert into linha.app_state (user_id, data, versao, atualizado_em)
                values ($1, $2, 1, now())
           on conflict (user_id) do update
                   set data = excluded.data,
                       versao = linha.app_state.versao + 1,
                       atualizado_em = now()
             returning versao::int as versao, atualizado_em`,
          [req.usuario.id, JSON.stringify(data)]
        );

        return { versao: salvo[0].versao, atualizado_em: salvo[0].atualizado_em };
      });

      if (resultado.conflito) {
        return reply.code(409).send({
          erro: "Esses dados mudaram em outro aparelho.",
          conflito: true,
          data: resultado.data,
          versao: resultado.versao,
        });
      }

      return { ok: true, versao: resultado.versao, atualizado_em: resultado.atualizado_em };
    }
  );

  // ─── Baixar tudo ───────────────────────────────────────────────────────────
  // Backup de verdade: um arquivo que o usuario guarda onde quiser. Sem isso,
  // apagar a conta (ou o banco) apagaria anos de historico sem copia nenhuma.
  app.get("/estado/backup", async (req, reply) => {
    const { rows } = await q(
      "select data, versao::int as versao, atualizado_em from linha.app_state where user_id = $1",
      [req.usuario.id]
    );

    const dia = new Date().toISOString().slice(0, 10);

    reply.header("content-type", "application/json; charset=utf-8");
    reply.header("content-disposition", `attachment; filename="linha-backup-${dia}.json"`);

    return {
      app: "linha",
      exportadoEm: new Date().toISOString(),
      usuario: { nome: req.usuario.nome, email: req.usuario.email },
      versao: rows[0]?.versao ?? 0,
      data: rows[0]?.data ?? null,
    };
  });
}
