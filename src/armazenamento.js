import { CHAVES_ANTIGAS, normalizar } from "./estado.js";

// ─── Armazenamento local ─────────────────────────────────────────────────────
//
// Duas coisas importantes aqui.
//
// 1. A chave é POR USUÁRIO ("linha:u:<id>"). Com login, uma chave única no
//    aparelho faria a segunda pessoa a entrar no mesmo celular abrir os dados
//    da primeira. O id do usuário no nome da chave fecha essa porta.
//
// 2. Este módulo não mente. Antes, o `set` engolia QuotaExceededError e o app
//    dizia "salvo" mesmo sem ter salvado; e um JSON corrompido no load caía num
//    catch que zerava o estado, e a interação seguinte gravava o padrão POR CIMA
//    do histórico bom. Agora: erro é devolvido, e dado ilegível vai pra
//    quarentena em vez de virar tela em branco.

export const disponivel = (() => {
  try {
    const k = "__linha_teste__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    // Safari com cookies bloqueados, aba anônima restrita, etc.
    return false;
  }
})();

const chaveDe = (userId) => `linha:u:${userId}`;
const chaveCopiaDe = (userId) => `linha:u:${userId}:copia`;

/** Lê o estado de um usuário. Devolve { estado, origem }. */
export function ler(userId) {
  if (!disponivel || !userId) return { estado: null, origem: null };

  for (const [chave, origem] of [
    [chaveDe(userId), "principal"],
    [chaveCopiaDe(userId), "copia"],
  ]) {
    let cru;
    try {
      cru = localStorage.getItem(chave);
    } catch {
      continue;
    }
    if (cru == null) continue;

    try {
      return { estado: normalizar(JSON.parse(cru)), origem };
    } catch {
      // Ilegível: guarda o original antes de tentar a cópia. Sem isso, o dado
      // corrompido seria sobrescrito na próxima gravação e sumiria pra sempre.
      poremQuarentena(chave, cru);
    }
  }

  return { estado: null, origem: null }; // usuário novo neste aparelho
}

function poremQuarentena(chave, conteudo) {
  try {
    const alvo = `linha:quarentena:${chave}:${Date.now()}`;
    localStorage.setItem(alvo, conteudo);
    console.error(`[linha] "${chave}" está ilegível. Guardei o conteúdo em "${alvo}".`);
  } catch {
    console.error(`[linha] "${chave}" está ilegível e não coube na quarentena.`);
  }
}

/**
 * Grava. Devolve { ok: true } ou { ok: false, motivo }.
 * Quem chama PRECISA olhar o retorno: é assim que a tela consegue avisar
 * "não consegui salvar neste aparelho" em vez de fingir que deu certo.
 */
export function gravar(userId, estado) {
  if (!disponivel) return { ok: false, motivo: "sem-armazenamento" };
  if (!userId) return { ok: false, motivo: "sem-usuario" };

  let texto;
  try {
    texto = JSON.stringify(estado);
  } catch {
    return { ok: false, motivo: "estado-invalido" };
  }

  try {
    localStorage.setItem(chaveDe(userId), texto);
  } catch (e) {
    const cheio =
      e?.name === "QuotaExceededError" ||
      e?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e?.code === 22;
    return { ok: false, motivo: cheio ? "sem-espaco" : "bloqueado" };
  }

  // Cópia sombra: se a chave principal corromper, o ler() cai nela em vez de
  // devolver um app zerado.
  try {
    localStorage.setItem(chaveCopiaDe(userId), texto);
  } catch {
    // A cópia é luxo. O principal já está salvo.
  }

  return { ok: true };
}

/** Apaga os dados deste usuário no aparelho. Chamado no logout. */
export function limpar(userId) {
  if (!userId) return;
  for (const c of [chaveDe(userId), chaveCopiaDe(userId)]) {
    try {
      localStorage.removeItem(c);
    } catch {
      /* ignora */
    }
  }
}

// ─── Dados da versão sem login ───────────────────────────────────────────────
// O Linha antigo guardava tudo numa chave única do aparelho ("linha:v4"), sem
// dono. NÃO dá pra entregar isso automaticamente pra quem logar primeiro — seria
// servir o histórico de uma pessoa para outra. Então o app só OFERECE a importação,
// e quem decide é o usuário.

export function lerLegado() {
  if (!disponivel) return null;

  for (const chave of CHAVES_ANTIGAS) {
    let cru;
    try {
      cru = localStorage.getItem(chave);
    } catch {
      continue;
    }
    if (!cru) continue;

    try {
      const estado = normalizar(JSON.parse(cru));
      const dias = estado.history?.length || 0;
      return { chave, estado, dias };
    } catch {
      /* ilegível: tenta a próxima */
    }
  }
  return null;
}

export function descartarLegado(chave) {
  try {
    localStorage.removeItem(chave);
  } catch {
    /* ignora */
  }
}
