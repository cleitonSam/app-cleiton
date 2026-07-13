import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const AQUI = dirname(fileURLToPath(import.meta.url));

// O Postgres do EasyPanel e compartilhado com o Typebot. Duas travas contra
// encostar nas tabelas dele: o schema proprio "linha" e este search_path.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  options: "-c search_path=linha,public",
});

pool.on("error", (err) => {
  // Um cliente ocioso pode cair (restart do Postgres, idle timeout do proxy).
  // O pool descarta e recria sozinho; sem este handler o Node derruba o processo.
  console.error("[db] cliente ocioso caiu:", err.message);
});

export const q = (texto, params) => pool.query(texto, params);

/** Roda numa transacao, com rollback automatico se algo estourar. */
export async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

// Trava global: se o EasyPanel subir duas replicas ao mesmo tempo, so uma migra.
const TRAVA_MIGRACAO = 918_273_645;

export async function migrar() {
  const c = await pool.connect();
  try {
    await c.query("select pg_advisory_lock($1)", [TRAVA_MIGRACAO]);

    // Precisa vir antes de tudo: o proprio controle de migracao mora no schema.
    await c.query("create schema if not exists linha");
    await c.query(`
      create table if not exists linha.schema_migrations (
        nome       text primary key,
        aplicada_em timestamptz not null default now()
      )
    `);

    const dir = join(AQUI, "migrations");
    const arquivos = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

    const { rows } = await c.query("select nome from linha.schema_migrations");
    const jaAplicadas = new Set(rows.map((r) => r.nome));

    for (const arquivo of arquivos) {
      if (jaAplicadas.has(arquivo)) continue;

      const sql = await readFile(join(dir, arquivo), "utf8");
      // Cada migracao e atomica: ou aplica inteira e marca, ou nao aconteceu.
      try {
        await c.query("begin");
        await c.query(sql);
        await c.query("insert into linha.schema_migrations (nome) values ($1)", [arquivo]);
        await c.query("commit");
        console.log(`[db] migracao aplicada: ${arquivo}`);
      } catch (e) {
        await c.query("rollback").catch(() => {});
        throw new Error(`migracao ${arquivo} falhou: ${e.message}`);
      }
    }
  } finally {
    await c.query("select pg_advisory_unlock($1)", [TRAVA_MIGRACAO]).catch(() => {});
    c.release();
  }
}
